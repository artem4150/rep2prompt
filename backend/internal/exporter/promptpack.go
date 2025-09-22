package exporter

import (
	"archive/tar"
	"archive/zip"
	"bufio"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"io"
	"path"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/yourname/cleanhttp/internal/filters"
	"github.com/yourname/cleanhttp/internal/secrets"
	"github.com/yourname/cleanhttp/internal/tokenest"
)

// ===== Параметры и DTO =====

type Profile string

const (
	ProfileShort Profile = "Short"
	ProfileFull  Profile = "Full"
	ProfileRAG   Profile = "RAG"
)

type PromptPackOptions struct {
	Owner, Repo, Ref string
	Profile          Profile
	ModelID          string
	TreeDepth        int
	LimitPerDir      int
	IncludeGlobs     []string
	ExcludeGlobs     []string
	MaxLinesPerFile  int
	MaskSecrets      bool

	TokenBudget   int
	ReservePct    int
	OverlapTokens int
}

type Dep struct{ Name, Version, Source string }

type EnvVar struct {
	Name     string
	Sources  []string
	Usages   []string
	Note     string
	isSecret bool
}

type packState struct {
	owner, repo, ref string
	profile          Profile
	nowUTC           time.Time

	// секции
	summary, treeMD, depsMD, envMD, prompts bytes.Buffer

	// дерево
	dirChildren      map[string][]string
	readmeFirstLines []string

	// deps/env
	deps   []Dep
	envMap map[string]*EnvVar

	// кандидаты на врезки
	excerptCandidates []excerptRef

	// бюджет и оценка
	modelID       string
	est           *tokenest.Estimator
	planner       *tokenest.Planner
	totalTokens   int
	reserveTokens int
	usableTokens  int
	overlapTokens int

	// лимиты и счётчики
	maxLinesPerFile int
	mainUsedTokens  int
	mainMaxTokens   int

	// чанки
	chunks   []chunk
	curChunk *chunk

	// секреты
	maskSecrets bool
	scanner     *secrets.Scanner
	maskedLines int
}

type chunk struct {
	title      string
	files      []chunkFile
	body       bytes.Buffer
	usedTokens int
	maxTokens  int
}

type chunkFile struct {
	Path, Language string
	Lines          int
}

type excerptRef struct {
	Path     string
	Priority int
}

// ===== Публичная точка входа =====

func BuildPromptPackFromTarGz(src io.Reader, dst io.Writer, opts PromptPackOptions) error {
	// дефолты
	if opts.Profile == "" {
		opts.Profile = ProfileShort
	}
	switch opts.Profile {
	case ProfileShort, ProfileRAG:
		if opts.MaxLinesPerFile == 0 {
			opts.MaxLinesPerFile = 200
		}
		if opts.TokenBudget == 0 {
			opts.TokenBudget = 50_000
		}
	case ProfileFull:
		if opts.MaxLinesPerFile == 0 {
			opts.MaxLinesPerFile = 400
		}
		if opts.TokenBudget == 0 {
			opts.TokenBudget = 200_000
		}
	}
	if opts.ReservePct == 0 {
		opts.ReservePct = 10
	}
	if opts.TreeDepth <= 0 {
		opts.TreeDepth = 3
	}
	if opts.LimitPerDir <= 0 {
		opts.LimitPerDir = 10
	}
	if opts.OverlapTokens <= 0 {
		opts.OverlapTokens = 150
	}

	// распаковка tar.gz
	gz, err := gzip.NewReader(src)
	if err != nil {
		return err
	}
	defer gz.Close()
	tr := tar.NewReader(gz)

	zw := zip.NewWriter(dst)
	defer zw.Close()

	// бюджет/оценка
	reg := tokenest.DefaultRegistry()
	est := tokenest.NewEstimator()
	pl := tokenest.NewPlanner(reg)

	total, reserve, usable := pl.Budget(string(opts.Profile), opts.ModelID)
	if total == 0 {
		total = opts.TokenBudget
		reserve = total * opts.ReservePct / 100
		usable = total - reserve
	}

	st := &packState{
		owner:           opts.Owner,
		repo:            opts.Repo,
		ref:             opts.Ref,
		profile:         opts.Profile,
		nowUTC:          time.Now().UTC(),
		dirChildren:     make(map[string][]string),
		envMap:          make(map[string]*EnvVar),
		modelID:         opts.ModelID,
		est:             est,
		planner:         pl,
		totalTokens:     total,
		reserveTokens:   reserve,
		usableTokens:    usable,
		overlapTokens:   opts.OverlapTokens,
		maxLinesPerFile: opts.MaxLinesPerFile,
		maskSecrets:     opts.MaskSecrets,
	}
	if st.maskSecrets {
		st.scanner = secrets.NewScanner(secrets.Config{Strategy: secrets.StrategyRedacted})
	}

	// 1) скан
	if err := st.scanTar(tr, opts); err != nil {
		return err
	}

	// 2) секции
	st.renderSummary()
	st.renderDeps()
	st.renderEnv()
	st.renderPrompts()
	st.renderTree(opts.TreeDepth, opts.LimitPerDir)

	// 3) лимит главного: usable - уже занятые секциями токены
	preTokens := st.est.CountForFiles([]string{
		st.summary.String(),
		st.treeMD.String(),
		st.depsMD.String(),
		st.envMD.String(),
		st.prompts.String(),
	}, st.modelID)
	headroom := st.usableTokens - preTokens
	if headroom < 1000 {
		headroom = 1000
	}
	st.mainMaxTokens = headroom

	// 4) второй проход — врезки
	return &NeedSecondPassError{state: st, zw: zw, opts: opts}
}

type NeedSecondPassError struct {
	state *packState
	opts  PromptPackOptions
	zw    *zip.Writer
}

func (e *NeedSecondPassError) Error() string { return "need_second_pass_for_excerpts" }

func FillSecondPassExcerpts(src io.Reader, e *NeedSecondPassError) error {
	gz, err := gzip.NewReader(src)
	if err != nil {
		return err
	}
	defer gz.Close()
	tr := tar.NewReader(gz)
	return e.state.renderExcerptsAndWriteZip(tr, e.zw)
}

// ======== Первый проход: SCAN ========

func (st *packState) scanTar(tr *tar.Reader, opts PromptPackOptions) error {
	// regex (используются ниже)
	reGo := regexp.MustCompile(`os\.Getenv\(\s*"([A-Z0-9_]+)"\s*\)`)
	reJS1 := regexp.MustCompile(`process\.env\.([A-Z0-9_]+)`)
	reJS2 := regexp.MustCompile(`import\.meta\.env\.([A-Z0-9_]+)`)
	rePy := regexp.MustCompile(`os\.getenv\(\s*['"]([A-Z0-9_]+)['"]\s*\)`)
	reDotNet := regexp.MustCompile(`Environment\.GetEnvironmentVariable\(\s*"(.*?)"\s*\)`)

	keyGlobs := []struct {
		pat  string
		prio int
	}{
		{"README*", 1},
		{"cmd/**/main.go", 1}, {"internal/server/**", 2},
		{"apps/**/app/**", 2}, {"pages/**", 2}, {"next.config.*", 2},
		{"Program.cs", 1}, {"Startup.cs", 1}, {"Controllers/**", 2},
		{"Makefile", 2}, {"Dockerfile*", 2}, {"docker-compose*.yml", 2}, {"k8s/**", 3},
		{"internal/**", 3}, {"src/**", 3},
		{"package.json", 1}, {"go.mod", 1}, {"*.csproj", 1}, {"pyproject.toml", 1}, {"requirements.txt", 1},
	}

	addEnv := func(name, src, usage, note string, secret bool) {
		if name == "" {
			return
		}
		ev, ok := st.envMap[name]
		if !ok {
			ev = &EnvVar{Name: name}
			st.envMap[name] = ev
		}
		if src != "" && !contains(ev.Sources, src) {
			ev.Sources = append(ev.Sources, src)
		}
		if usage != "" && !contains(ev.Usages, usage) {
			ev.Usages = append(ev.Usages, usage)
		}
		if note != "" {
			ev.Note = note
		}
		if secret {
			ev.isSecret = true
		}
	}

	const sampleN = 4096

	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
		if hdr.Typeflag != tar.TypeReg {
			continue
		}

		name := stripFirstDir(hdr.Name)
		rel, err := filters.NormalizeRel(name)
		if err != nil || rel == "" {
			drain(tr, hdr.Size)
			continue
		}
		if !filters.Match(rel, opts.IncludeGlobs, opts.ExcludeGlobs) {
			drain(tr, hdr.Size)
			continue
		}

		// дерево
		st.addToTree(rel)

		// сэмпл
		sn := min64(hdr.Size, sampleN)
		sample := make([]byte, sn)
		if sn > 0 {
			if _, err := io.ReadFull(tr, sample); err != nil {
				continue
			}
		}
		if filters.IsBinarySample(sample) {
			drainN(tr, hdr.Size-sn)
			continue
		}

		lower := strings.ToLower(rel)

		// README → SUMMARY
		if isReadme(lower) {
			lines := readFirstLines(io.MultiReader(bytes.NewReader(sample), &countReader{R: tr}), 30, int(hdr.Size-sn))
			st.readmeFirstLines = pickSummaryLines(lines)
			continue
		}

		// deps/env источники
		switch {
		case path.Base(lower) == "package.json":
			content := readWhole(io.MultiReader(bytes.NewReader(sample), &countReader{R: tr}), 512*1024, int(hdr.Size-sn))
			st.parseNpm(content)
		case path.Base(lower) == "go.mod":
			content := readWhole(io.MultiReader(bytes.NewReader(sample), &countReader{R: tr}), 256*1024, int(hdr.Size-sn))
			st.parseGoMod(content)
		case strings.HasSuffix(lower, ".csproj"):
			content := readWhole(io.MultiReader(bytes.NewReader(sample), &countReader{R: tr}), 512*1024, int(hdr.Size-sn))
			st.parseCsproj(content)
		case path.Base(lower) == "pyproject.toml" || path.Base(lower) == "requirements.txt":
			content := readWhole(io.MultiReader(bytes.NewReader(sample), &countReader{R: tr}), 512*1024, int(hdr.Size-sn))
			st.parsePythonDeps(lower, content)
		case strings.HasPrefix(path.Base(lower), "docker-compose") && (strings.HasSuffix(lower, ".yml") || strings.HasSuffix(lower, ".yaml")):
			content := readWhole(io.MultiReader(bytes.NewReader(sample), &countReader{R: tr}), 512*1024, int(hdr.Size-sn))
			for _, v := range grepEnvFromCompose(content) {
				addEnv(v, "compose", "", maybeSecret(v), isSecret(v))
			}
		case strings.HasPrefix(path.Base(lower), ".env"):
			content := readWhole(io.MultiReader(bytes.NewReader(sample), &countReader{R: tr}), 256*1024, int(hdr.Size-sn))
			for _, v := range grepEnvFromDotenv(content) {
				addEnv(v, ".env", "", maybeSecret(v), isSecret(v))
			}
		default:
			content := readWhole(io.MultiReader(bytes.NewReader(sample), &countReader{R: tr}), 512*1024, int(hdr.Size-sn))
			usagePrefix := rel + ":"
			for _, m := range reGo.FindAllStringSubmatch(content, -1) {
				addEnv(m[1], "code", usagePrefix, maybeSecret(m[1]), isSecret(m[1]))
			}
			for _, m := range reJS1.FindAllStringSubmatch(content, -1) {
				addEnv(m[1], "code", usagePrefix, maybeSecret(m[1]), isSecret(m[1]))
			}
			for _, m := range reJS2.FindAllStringSubmatch(content, -1) {
				addEnv(m[1], "code", usagePrefix, maybeSecret(m[1]), isSecret(m[1]))
			}
			for _, m := range rePy.FindAllStringSubmatch(content, -1) {
				addEnv(m[1], "code", usagePrefix, maybeSecret(m[1]), isSecret(m[1]))
			}
			for _, m := range reDotNet.FindAllStringSubmatch(content, -1) {
				addEnv(m[1], "code", usagePrefix, maybeSecret(m[1]), isSecret(m[1]))
			}
		}

		// кандидаты на EXCERPTS
		for _, kg := range keyGlobs {
			if filters.Match(rel, []string{kg.pat}, nil) {
				st.excerptCandidates = append(st.excerptCandidates, excerptRef{Path: rel, Priority: kg.prio})
				break
			}
		}
	}

	// сортировка
	sort.SliceStable(st.excerptCandidates, func(i, j int) bool {
		if st.excerptCandidates[i].Priority != st.excerptCandidates[j].Priority {
			return st.excerptCandidates[i].Priority < st.excerptCandidates[j].Priority
		}
		return st.excerptCandidates[i].Path < st.excerptCandidates[j].Path
	})
	sort.Slice(st.deps, func(i, j int) bool { return st.deps[i].Name < st.deps[j].Name })
	return nil
}

// ===== Рендер секций =====

func (st *packState) renderSummary() {
	sb := &st.summary
	fmt.Fprintf(sb, "# Prompt Pack — %s/%s@%s\n", st.owner, st.repo, st.ref)
	fmt.Fprintf(sb, "Дата: %s (UTC)\n", st.nowUTC.Format("2006-01-02"))
	fmt.Fprintf(sb, "Профиль: %s\n", st.profile)
	fmt.Fprintf(sb, "Модель: %s, бюджет токенов: %d, резерв под вопросы: ~%d\n", st.modelID, st.totalTokens, st.reserveTokens)
	fmt.Fprintf(sb, "Сгенерировано из путей: <repo-root/*> (свёрнуто)\n\n")

	fmt.Fprintf(sb, "## 01_SUMMARY\n\n")
	if len(st.readmeFirstLines) > 0 {
		fmt.Fprintln(sb, "- **Цель**:")
		for _, l := range st.readmeFirstLines {
			fmt.Fprintf(sb, "  - %s\n", strings.TrimSpace(l))
		}
	} else {
		fmt.Fprintln(sb, "- **Цель**: (нет данных)")
	}
	fmt.Fprintln(sb, "- **Стек**: автоопределение по deps (см. DEPS)")
	fmt.Fprintln(sb, "- **Точки входа**: эвристики по файлам (cmd/*/main.go, app/page.tsx, Program.cs)")
	fmt.Fprintln(sb, "- **Запуск**: см. Dockerfile/docker-compose/README (эвристика)")
	fmt.Fprintln(sb, "- **Ограничения**: бинарники и LFS могут быть пропущены в врезках")
	fmt.Fprintln(sb)
}

func (st *packState) renderTree(depth, limit int) {
	var b = &st.treeMD
	fmt.Fprintln(b, "## 02_TREE")
	fmt.Fprintln(b)
	fmt.Fprintln(b, "repo-root/")
	renderDir(b, "repo-root", "", st.dirChildren, 0, depth, limit)
	fmt.Fprintln(b)
}

func (st *packState) renderDeps() {
	var b = &st.depsMD
	fmt.Fprintln(b, "## 03_DEPS")
	fmt.Fprintln(b)
	if len(st.deps) == 0 {
		fmt.Fprintln(b, "_нет зависимостей или не обнаружены_")
		return
	}
	groups := map[string][]Dep{}
	for _, d := range st.deps {
		groups[d.Source] = append(groups[d.Source], d)
	}
	keys := make([]string, 0, len(groups))
	for k := range groups {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		fmt.Fprintf(b, "### %s\n\n", strings.ToUpper(k))
		fmt.Fprintln(b, "| package | version |")
		fmt.Fprintln(b, "|---------|---------|")
		max := 20
		for i, d := range groups[k] {
			if i >= max {
				fmt.Fprintln(b, "| … | … |")
				break
			}
			fmt.Fprintf(b, "| %s | %s |\n", d.Name, d.Version)
		}
		fmt.Fprintln(b)
	}
}

func (st *packState) renderEnv() {
	var b = &st.envMD
	fmt.Fprintln(b, "## 04_ENV")
	fmt.Fprintln(b)
	if len(st.envMap) == 0 {
		fmt.Fprintln(b, "_переменные окружения не обнаружены_")
		return
	}
	var keys []string
	for k := range st.envMap {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	fmt.Fprintln(b, "| VAR | Источник(и) | Использование | Примечание |")
	fmt.Fprintln(b, "|-----|-------------|---------------|------------|")
	for _, k := range keys {
		ev := st.envMap[k]
		src := strings.Join(ev.Sources, ", ")
		use := strings.Join(ev.Usages, ", ")
		note := ev.Note
		if ev.isSecret {
			note = "секрет"
		}
		fmt.Fprintf(b, "| %s | %s | %s | %s |\n", ev.Name, src, use, note)
	}
	fmt.Fprintln(b)
}

func (st *packState) renderPrompts() {
	var b = &st.prompts
	fmt.Fprintln(b, "## 05_PROMPTS")
	fmt.Fprintln(b)
	fmt.Fprintln(b, "- Обзор кода: «Объясни архитектуру, точки входа и риски. Начни с 3 bullets, затем детали по модулям.»")
	fmt.Fprintln(b, "- Рефакторинг файла: «Вот контекст (ниже). Перепиши с учётом линтера и кодстайла, не меняя поведение.»")
	fmt.Fprintln(b, "- Тесты: «Сгенерируй юнит-тесты для X с покрытием Y и примерами граничных случаев.»")
	fmt.Fprintln(b, "- Миграции/деплой: «Обнови Dockerfile под актуальный LTS/Go 1.23. Объясни изменения.»")
	fmt.Fprintln(b, "- Q&A: «Отвечай на вопросы по модулю X, цитируя пути и строки из врезок.»")
	fmt.Fprintln(b)
}

// ===== Врезки + чанкование по токенам =====

func (st *packState) renderExcerptsAndWriteZip(tr *tar.Reader, zw *zip.Writer) error {
	var main bytes.Buffer
	write := func(s string) { main.WriteString(s) }

	pre := st.summary.String() + st.treeMD.String() + st.depsMD.String() + st.envMD.String() + st.prompts.String()
	write(pre)
	st.mainUsedTokens = st.est.CountTokens(pre, st.modelID)

	write("## 06_EXCERPTS\n\n")
	st.mainUsedTokens += st.est.CountTokens("## 06_EXCERPTS\n\n", st.modelID)

	newChunk := func(title string) *chunk {
		c := &chunk{title: title, maxTokens: st.usableTokens}
		st.chunks = append(st.chunks, *c)
		return &st.chunks[len(st.chunks)-1]
	}

	for _, ref := range st.excerptCandidates {
		seg, lines, lang, err := extractHead(tr, ref.Path, st.maxLinesPerFile)
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}

		// маскирование
		if st.maskSecrets && st.scanner != nil {
			var b strings.Builder
			ln := 0
			for _, line := range strings.Split(seg, "\n") {
				ln++
				finds := st.scanner.ScanLine(ref.Path, line, ln)
				out := st.scanner.ApplyStrategy(line, finds)
				if out != line {
					st.maskedLines++
				}
				b.WriteString(out)
				b.WriteByte('\n')
			}
			seg = b.String()
		}

		header := fmt.Sprintf("### FILE: %s (first %d lines)\n", ref.Path, lines)
		codeFence := "```" + lang + "\n"
		block := header + codeFence + seg + "```\n\n"
		if st.maskedLines > 0 {
			block += "_секреты замаскированы_\n\n"
		}
		blockTokens := st.est.CountTokens(block, st.modelID)

		if st.mainUsedTokens+blockTokens <= st.mainMaxTokens {
			write(block)
			st.mainUsedTokens += blockTokens
			continue
		}

		if st.curChunk == nil {
			st.curChunk = newChunk("CHUNK 1")
		}
		need := blockTokens
		if st.curChunk.usedTokens > 0 && st.overlapTokens > 0 {
			need += st.overlapTokens
		}
		if st.curChunk.usedTokens > 0 && st.curChunk.usedTokens+need > st.curChunk.maxTokens {
			// закрываем текущий — открываем новый
			st.curChunk = newChunk(fmt.Sprintf("CHUNK %d", len(st.chunks)+1))
			need = blockTokens
		}
		// overlap из предыдущего чанка
		if len(st.chunks) > 0 && st.curChunk.usedTokens > 0 && st.overlapTokens > 0 {
			prev := &st.chunks[len(st.chunks)-1]
			ov := st.lastNTokensFrom(prev.body.String(), st.overlapTokens)
			st.curChunk.body.WriteString("> Overlap (previous):\n>\n")
			for _, ln := range strings.Split(strings.TrimRight(ov, "\n"), "\n") {
				st.curChunk.body.WriteString("> " + ln + "\n")
			}
			st.curChunk.body.WriteString("\n")
			st.curChunk.usedTokens += st.overlapTokens
		}

		st.curChunk.body.WriteString(block)
		st.curChunk.files = append(st.curChunk.files, chunkFile{Path: ref.Path, Lines: lines, Language: lang})
		st.curChunk.usedTokens += blockTokens
	}

	// запись основного файла
	fn := fmt.Sprintf("PromptPack-%s.md", st.profile)
	if err := writeZipEntry(zw, fn, main.Bytes()); err != nil {
		return err
	}

	// чанки
	for i := range st.chunks {
		ch := &st.chunks[i]
		if ch.usedTokens == 0 {
			continue
		}
		var md bytes.Buffer
		fmt.Fprintf(&md, "# %s\n\nСодержимое:\n", ch.title)
		for _, f := range ch.files {
			fmt.Fprintf(&md, "- %s (%d строк)\n", f.Path, f.Lines)
		}
		md.WriteString("\nКак использовать: задавай вопросы только по этому чанку; при ссылке на другие — укажи их номер.\n\n")
		md.Write(ch.body.Bytes())
		name := fmt.Sprintf("chunk-%03d.md", i+1)
		if err := writeZipEntry(zw, name, md.Bytes()); err != nil {
			return err
		}
	}
	return nil
}

// ===== Утилиты и парсеры =====

func isReadme(p string) bool {
	base := strings.ToLower(path.Base(p))
	return base == "readme" || base == "readme.md" || base == "readme.txt" || strings.HasPrefix(base, "readme.")
}

func (st *packState) addToTree(rel string) {
	dir := "repo-root"
	if strings.Contains(rel, "/") {
		parts := strings.Split(rel, "/")
		for i := 0; i < len(parts)-1; i++ {
			prefix := path.Join(parts[:i+1]...)
			parent := path.Join(dir, prefix)
			child := parts[i+1]
			st.dirChildren[parent] = addChildUnique(st.dirChildren[parent], child)
		}
		parent := path.Join(dir, path.Dir(rel))
		child := path.Base(rel)
		st.dirChildren[parent] = addChildUnique(st.dirChildren[parent], child)
	} else {
		st.dirChildren[dir] = addChildUnique(st.dirChildren[dir], rel)
	}
}

func renderDir(b *bytes.Buffer, root, pathPrefix string, m map[string][]string, level, maxDepth, limit int) {
	if level >= maxDepth {
		return
	}
	key := root
	if pathPrefix != "" {
		key = root + "/" + pathPrefix
	}
	children := m[key]
	sort.Strings(children)
	count := len(children)
	if count == 0 {
		return
	}
	shown := 0
	for _, name := range children {
		if shown >= limit {
			fmt.Fprintf(b, "├─ … + %d more\n", count-shown)
			break
		}
		shown++
		indent := strings.Repeat("│  ", level)
		fmt.Fprintf(b, "%s├─ %s\n", indent, name)
		if !strings.Contains(name, ".") {
			nextPrefix := name
			if pathPrefix != "" {
				nextPrefix = pathPrefix + "/" + name
			}
			renderDir(b, root, nextPrefix, m, level+1, maxDepth, limit)
		}
	}
}

func stripFirstDir(p string) string {
	if i := strings.IndexByte(p, '/'); i >= 0 {
		return p[i+1:]
	}
	return p
}

func addChildUnique(xs []string, child string) []string {
	for _, x := range xs {
		if x == child {
			return xs
		}
	}
	return append(xs, child)
}

func contains(xs []string, s string) bool {
	for _, x := range xs {
		if x == s {
			return true
		}
	}
	return false
}

func unique(xs []string) []string {
	m := map[string]struct{}{}
	var out []string
	for _, x := range xs {
		if _, ok := m[x]; !ok {
			m[x] = struct{}{}
			out = append(out, x)
		}
	}
	return out
}

// countReader — определён в txtbuilder.go (в этом же пакете). Здесь НЕ повторяем,
// чтобы избежать ошибки "redeclared in this block".

func readWhole(r io.Reader, maxBytes int, expect int) string {
	limit := maxBytes
	if expect > 0 && expect < maxBytes {
		limit = expect
	}
	lr := &io.LimitedReader{R: r, N: int64(limit)}
	b, _ := io.ReadAll(lr)
	return string(b)
}

func readFirstLines(r io.Reader, maxLines, _ int) []string {
	sc := bufio.NewScanner(r)
	sc.Buffer(make([]byte, 0, 64*1024), 2*1024*1024)
	var out []string
	for sc.Scan() && len(out) < maxLines {
		line := strings.TrimSpace(sc.Text())
		if line != "" {
			out = append(out, line)
		}
	}
	return out
}

func pickSummaryLines(lines []string) []string {
	if len(lines) == 0 {
		return nil
	}
	if len(lines) > 3 {
		return lines[:3]
	}
	return lines
}

func grepEnvFromDotenv(content string) []string {
	var out []string
	for _, l := range strings.Split(content, "\n") {
		l = strings.TrimSpace(l)
		if l == "" || strings.HasPrefix(l, "#") {
			continue
		}
		parts := strings.SplitN(l, "=", 2)
		if len(parts) == 2 && isEnvKey(parts[0]) {
			out = append(out, strings.TrimSpace(parts[0]))
		}
	}
	return unique(out)
}

func grepEnvFromCompose(content string) []string {
	re := regexp.MustCompile(`(?m)^\s*[-]?\s*([A-Z0-9_]+)\s*=\s*[^#\s]+`)
	m := re.FindAllStringSubmatch(content, -1)
	var out []string
	for _, x := range m {
		out = append(out, x[1])
	}
	return unique(out)
}

func isEnvKey(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if !((r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_') {
			return false
		}
	}
	return true
}

func maybeSecret(name string) string {
	u := strings.ToUpper(name)
	if strings.Contains(u, "SECRET") || strings.Contains(u, "TOKEN") || strings.Contains(u, "PASSWORD") || strings.Contains(u, "API") || strings.Contains(u, "KEY") || strings.Contains(u, "PWD") || strings.Contains(u, "PRIVATE") {
		return "секрет"
	}
	return ""
}

func isSecret(name string) bool { return maybeSecret(name) != "" }

func extractHead(tr *tar.Reader, wantPath string, maxLines int) (segment string, lines int, lang string, err error) {
	for {
		hdr, e := tr.Next()
		if e == io.EOF {
			return "", 0, "", io.EOF
		}
		if e != nil {
			return "", 0, "", e
		}
		if hdr.Typeflag != tar.TypeReg {
			continue
		}
		if stripFirstDir(hdr.Name) != wantPath {
			continue
		}
		sc := bufio.NewScanner(tr)
		sc.Buffer(make([]byte, 0, 64*1024), 10*1024*1024)
		var buf bytes.Buffer
		i := 0
		for sc.Scan() {
			i++
			line := sc.Text()
			if strings.HasSuffix(line, "\r") {
				line = strings.TrimSuffix(line, "\r")
			}
			buf.WriteString(line)
			buf.WriteByte('\n')
			if maxLines > 0 && i >= maxLines {
				break
			}
		}
		lang = codeLangByExt(wantPath)
		return buf.String(), i, lang, nil
	}
}

func codeLangByExt(p string) string {
	ext := strings.ToLower(path.Ext(p))
	switch ext {
	case ".ts", ".tsx":
		return "tsx"
	case ".js", ".jsx":
		return "jsx"
	case ".go":
		return "go"
	case ".cs":
		return "csharp"
	case ".py":
		return "python"
	case ".json":
		return "json"
	case ".yml", ".yaml":
		return "yaml"
	case ".toml":
		return "toml"
	case ".md", ".txt":
		return ""
	default:
		return ""
	}
}

func writeZipEntry(zw *zip.Writer, name string, data []byte) error {
	w, err := zw.CreateHeader(&zip.FileHeader{Name: name, Method: zip.Store})
	if err != nil {
		return err
	}
	_, err = w.Write(data)
	return err
}

func drain(r io.Reader, n int64) {
	if n > 0 {
		_, _ = io.CopyN(io.Discard, r, n)
	}
}
func drainN(r io.Reader, n int64) { drain(r, n) }

// min64 — маленький помощник для int64.
func min64(a int64, b int) int64 {
	x := int64(b)
	if a < x {
		return a
	}
	return x
}

func (st *packState) lastNTokensFrom(text string, n int) string {
	if n <= 0 || text == "" {
		return ""
	}
	// грубо: 1 токен ≈ 4 символа
	approxChars := n * 4
	rs := []rune(text)
	if len(rs) <= approxChars {
		return text
	}
	start := len(rs) - approxChars
	if start < 0 {
		start = 0
	}
	return string(rs[start:])
}

// ===== deps parsers (MVP) =====

func (st *packState) parseNpm(content string) {
	var obj struct {
		Name    string            `json:"name"`
		Version string            `json:"version"`
		Engines map[string]string `json:"engines"`
		Deps    map[string]string `json:"dependencies"`
		Dev     map[string]string `json:"devDependencies"`
	}
	_ = json.Unmarshal([]byte(content), &obj)
	if obj.Name != "" {
		st.deps = append(st.deps, Dep{Name: obj.Name, Version: obj.Version, Source: "npm-project"})
	}
	add := func(m map[string]string, src string, max int) {
		if len(m) == 0 {
			return
		}
		names := make([]string, 0, len(m))
		for k := range m {
			names = append(names, k)
		}
		sort.Strings(names)
		for i, n := range names {
			if i >= max {
				break
			}
			st.deps = append(st.deps, Dep{Name: n, Version: m[n], Source: src})
		}
	}
	add(obj.Deps, "npm", 15)
	add(obj.Dev, "npm-dev", 10)
}

func (st *packState) parseGoMod(content string) {
	lines := strings.Split(content, "\n")
	for _, l := range lines {
		l = strings.TrimSpace(l)
		if strings.HasPrefix(l, "module ") {
			st.deps = append(st.deps, Dep{Name: strings.TrimSpace(strings.TrimPrefix(l, "module")), Version: "", Source: "gomod-module"})
		} else if strings.HasPrefix(l, "go ") {
			st.deps = append(st.deps, Dep{Name: "go", Version: strings.TrimSpace(strings.TrimPrefix(l, "go")), Source: "gomod"})
		} else {
			parts := strings.Fields(l)
			if len(parts) == 2 && parts[0] != "module" && parts[0] != "go" {
				st.deps = append(st.deps, Dep{Name: parts[0], Version: parts[1], Source: "gomod"})
			}
		}
	}
}

func (st *packState) parseCsproj(content string) {
	lines := strings.Split(content, "\n")
	var tf []string
	rePkg := regexp.MustCompile(`PackageReference\s+Include="([^"]+)"\s+Version="([^"]+)"`)
	reTF := regexp.MustCompile(`<TargetFramework(?:s?)>([^<]+)</TargetFramework(?:s?)>`)
	for _, l := range lines {
		if m := reTF.FindStringSubmatch(l); len(m) == 2 {
			for _, x := range strings.Split(m[1], ";") {
				tf = append(tf, strings.TrimSpace(x))
			}
		}
		if m := rePkg.FindStringSubmatch(l); len(m) == 3 {
			st.deps = append(st.deps, Dep{Name: m[1], Version: m[2], Source: "nuget"})
		}
	}
	if len(tf) > 0 {
		st.deps = append(st.deps, Dep{Name: "TargetFramework", Version: strings.Join(tf, ","), Source: "nuget-project"})
	}
}

func (st *packState) parsePythonDeps(filename, content string) {
	if path.Base(filename) == "requirements.txt" {
		lines := strings.Split(content, "\n")
		for i, l := range lines {
			l = strings.TrimSpace(l)
			if l == "" || strings.HasPrefix(l, "#") {
				continue
			}
			if i >= 20 {
				break
			}
			st.deps = append(st.deps, Dep{Name: l, Version: "", Source: "pip"})
		}
		return
	}
	var name, ver string
	reName := regexp.MustCompile(`(?m)^\s*name\s*=\s*["']([^"']+)["']`)
	reVer := regexp.MustCompile(`(?m)^\s*version\s*=\s*["']([^"']+)["']`)
	if m := reName.FindStringSubmatch(content); len(m) == 2 {
		name = m[1]
	}
	if m := reVer.FindStringSubmatch(content); len(m) == 2 {
		ver = m[1]
	}
	if name != "" {
		st.deps = append(st.deps, Dep{Name: name, Version: ver, Source: "pip-project"})
	}
}
