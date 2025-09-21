package secrets

import (
	"encoding/base64"
	"encoding/json"
	"sort"
	"strings"
)

// Scanner — реализация SecretScanner.
type Scanner struct {
	cfg      Config
	rules    []rule
	report   SecretReport
	perFile  map[string]*fileAgg // для корреляций (например, AWS пара)
}

type fileAgg struct {
	seen map[string]bool // rule ids seen
}

func NewScanner(cfg Config) *Scanner {
	s := &Scanner{
		cfg:     cfg,
		rules:   compileRules(),
		perFile: make(map[string]*fileAgg),
		report: SecretReport{
			ByKind:          map[Kind]int{},
			AppliedStrategy: cfg.Strategy,
		},
	}
	return s
}

func (s *Scanner) Reset() {
	s.report = SecretReport{
		ByKind:          map[Kind]int{},
		AppliedStrategy: s.cfg.Strategy,
	}
	s.perFile = make(map[string]*fileAgg)
}

func (s *Scanner) agg(path string) *fileAgg {
	if a, ok := s.perFile[path]; ok {
		return a
	}
	a := &fileAgg{seen: map[string]bool{}}
	s.perFile[path] = a
	return a
}

func (s *Scanner) Report() SecretReport {
	// собрать Files[] из агрегатов
	var files []FileSummary
	for p, a := range s.perFile {
		var kinds []Kind
		var levels []Severity
		// это лишь «псевдо-summary» (грубая метрика)
		for _, r := range s.rules {
			if a.seen[r.id] {
				kinds = append(kinds, r.kind)
				levels = append(levels, r.sev)
			}
		}
		files = append(files, FileSummary{Path: p, Count: len(kinds), Kinds: kinds, Levels: levels})
	}
	// отсортируем для стабильности
	sort.Slice(files, func(i, j int) bool { return files[i].Path < files[j].Path })
	out := s.report
	out.Files = files
	return out
}

// ScanLine — построчная проверка.
func (s *Scanner) ScanLine(path, line string, lineno int) []Finding {
	// быстрые пропуски — фиктивные значения
	lowers := strings.ToLower(line)
	if strings.Contains(lowers, "redacted") || strings.Contains(lowers, "dummy") || strings.Contains(lowers, "placeholder") {
		return nil
	}
	// комментарии/примеры — понизим серьёзность
	suspectComment := strings.Contains(lowers, "example") || strings.Contains(lowers, "sample") || strings.Contains(lowers, "fake") || strings.Contains(lowers, "test")

	var finds []Finding
	for _, r := range s.rules {
		idxs := r.re.FindAllStringIndex(line, -1)
		for _, span := range idxs {
			f := Finding{
				Path:   path,
				LineNo: lineno,
				Kind:   r.kind,
				RuleID: r.id,
				Span:   Span{Start: span[0], End: span[1]},
				Severity: r.sev,
				Note:   r.note,
				Value:  line[span[0]:span[1]],
			}
			// ENV special: только «подозрительные» ключи считаем секретными
			if r.id == "env_pair" {
				key := strings.ToUpper(strings.TrimSpace(strings.SplitN(f.Value, "=", 2)[0]))
				if !(strings.Contains(key, "SECRET") || strings.Contains(key, "TOKEN") || strings.Contains(key, "PASSWORD") || strings.Contains(key, "API") || strings.Contains(key, "KEY") || strings.Contains(key, "PWD") || strings.Contains(key, "PRIVATE")) {
					// не считаем это секретом
					continue
				}
			}
			// JWT — проверим, что первые два сегмента декодируются как JSON-подобные
			if r.id == "jwt" && !looksLikeJWT(f.Value) {
				continue
			}
			// понижаем severity для комментариев/фикстур
			if suspectComment && f.Severity == SevHigh {
				f.Severity = SevMed
			} else if suspectComment && f.Severity == SevMed {
				f.Severity = SevLow
			}
			finds = append(finds, f)
		}
	}

	// AWS пара: если в файле встретились и id, и secret — повышаем до HIGH
	a := s.agg(path)
	seenIDs := map[string]bool{}
	for _, f := range finds {
		seenIDs[f.RuleID] = true
	}
	for id := range seenIDs {
		a.seen[id] = true
	}
	if a.seen["aws_akid"] && a.seen["aws_secret"] {
		for i := range finds {
			if finds[i].RuleID == "aws_akid" || finds[i].RuleID == "aws_secret" {
				finds[i].Severity = SevHigh
			}
		}
	}

	// учёт в отчёте
	s.report.TotalFindings += len(finds)
	for _, f := range finds {
		s.report.ByKind[f.Kind]++
	}

	return finds
}

// ScanBlob — на будущее (для двоичных/больших кусков).
func (s *Scanner) ScanBlob(path string, b []byte) []Finding {
	_ = path; _ = b
	return nil
}

// ApplyStrategy — применить стратегию к строке с учётом находок.
func (s *Scanner) ApplyStrategy(line string, finds []Finding) string {
	if len(finds) == 0 {
		return line
	}
	switch s.cfg.Strategy {
	case StrategyStrip:
		// полностью заменить строку
		if len(finds) > 0 {
			return "# <STRIPPED:" + finds[0].RuleID + ">\n"
		}
		return "# <STRIPPED>\n"
	case StrategyMark:
		// заменяем подсегменты, начиная справа налево
		out := line
		sort.Slice(finds, func(i, j int) bool { return finds[i].Span.Start > finds[j].Span.Start })
		for _, f := range finds {
			prefix := out[:f.Span.Start]
			mid := out[f.Span.Start:f.Span.End]
			suffix := out[f.Span.End:]
			out = prefix + "<<SECRET:" + f.RuleID + ">>" + mid + "<<END>>" + suffix
		}
		return out
	default: // StrategyRedacted
		out := line
		sort.Slice(finds, func(i, j int) bool { return finds[i].Span.Start > finds[j].Span.Start })
		for _, f := range finds {
			prefix := out[:f.Span.Start]
			suffix := out[f.Span.End:]
			out = prefix + "<REDACTED:" + f.RuleID + ">" + suffix
		}
		return out
	}
}

func looksLikeJWT(tok string) bool {
	parts := strings.Split(tok, ".")
	if len(parts) != 3 {
		return false
	}
	dec := func(s string) []byte {
		b, err := base64.RawURLEncoding.DecodeString(s)
		if err != nil {
			return nil
		}
		return b
	}
	hdr, pl := dec(parts[0]), dec(parts[1])
	if hdr == nil || pl == nil {
		return false
	}
	// Очень грубо — должны быть JSON-похожие ключи
	var m1, m2 map[string]any
	if json.Unmarshal(hdr, &m1) != nil || json.Unmarshal(pl, &m2) != nil {
		return false
	}
	// наличие типичных полей не обязательно, но если есть — хорошо
	return true
}
