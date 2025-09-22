package exporter

import (
	"archive/tar" // читаем TAR
	"bufio"       // построчное чтение
	"bytes"
	"compress/gzip" // распаковываем .tar.gz
	"fmt"
	"io"
	"strconv"
	"strings"

	"github.com/yourname/cleanhttp/internal/filters"
	"github.com/yourname/cleanhttp/internal/secrets"
)

// TxtOptions — параметры экспорта TXT.
type TxtOptions struct {
	IncludeGlobs    []string         // маски include
	ExcludeGlobs    []string         // маски exclude
	StripFirstDir   bool             // срезать первый сегмент (у GitHub tar это repo-<sha>/...)
	LineNumbers     bool             // печатать "N\tстрока"
	HeaderTemplate  string           // заголовок перед каждым файлом: поддерживает {path} и {n}
	MaxLinesPerFile int              // 0 = без обрезки; иначе ограничиваем строки на файл
	MaxExportMB     int              // общий лимит выходного TXT (в мегабайтах); 0 = без лимита
	SkipBinaries    bool             // пропускать «бинарные» файлы (эвристика)
	SecretScan      bool             // включить сканирование (дефолт: true)
	SecretStrategy  secrets.Strategy // стратегия (дефолт: REDACTED)
}

// BuildTxtFromTarGz — конвертит tar.gz поток в «плоский» TXT.
// Память O(1) в сумме, но для КАЖДОГО файла буферим только его первые N строк,
// чтобы сформировать заголовок с фактическим {n}.
func BuildTxtFromTarGz(src io.Reader, dst io.Writer, opts TxtOptions) error {
	// дефолты
	if opts.HeaderTemplate == "" {
		opts.HeaderTemplate = "=== FILE: {path} (first {n} lines) ==="
	}
	if opts.MaxLinesPerFile < 0 {
		opts.MaxLinesPerFile = 0
	}
	// Управление сканированием секретов: если опция включена — создаём сканер.
	doScan := opts.SecretScan
	strategy := opts.SecretStrategy
	if strategy != secrets.StrategyRedacted &&
		strategy != secrets.StrategyStrip &&
		strategy != secrets.StrategyMark {
		strategy = secrets.StrategyRedacted
	}
	var scanner *secrets.Scanner
	if doScan {
		scanner = secrets.NewScanner(secrets.Config{Strategy: strategy})
	}

	// распаковка gzip → tar.Reader
	gz, err := gzip.NewReader(src)
	if err != nil {
		return err
	}
	defer gz.Close()
	tr := tar.NewReader(gz)

	// учёт размера выходного файла (для MaxExportMB)
	var written int64
	write := func(p []byte) error {
		if len(p) == 0 {
			return nil
		}
		if opts.MaxExportMB > 0 {
			limit := int64(opts.MaxExportMB) * 1024 * 1024
			if written+int64(len(p)) > limit {
				return ErrExportTooLarge
			}
		}
		n, err := dst.Write(p)
		written += int64(n)
		return err
	}

	// сколько байт берём для эвристики «бинарности»
	const sampleN = 4096

	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break // конец архива
		}
		if err != nil {
			return err
		}
		// пропускаем всё, кроме обычных файлов
		if hdr.Typeflag != tar.TypeReg {
			continue
		}

		// "owner-repo-sha/path/to/file" → "path/to/file" (если надо)
		name := hdr.Name
		if opts.StripFirstDir {
			if i := strings.IndexByte(name, '/'); i >= 0 {
				name = name[i+1:]
			} else {
				// неожиданный формат — пропустим
				_, _ = io.CopyN(io.Discard, tr, hdr.Size)
				continue
			}
		}
		// нормализуем и страхуемся от "..", нулей и т.д.
		rel, err := filters.NormalizeRel(name)
		if err != nil || rel == "" {
			_, _ = io.CopyN(io.Discard, tr, hdr.Size)
			continue
		}
		// маски include/exclude
		if !filters.Match(rel, opts.IncludeGlobs, opts.ExcludeGlobs) {
			_, _ = io.CopyN(io.Discard, tr, hdr.Size)
			continue
		}

		// возьмём сэмпл для детекции бинарников
		sz := hdr.Size
		sn := int64(sampleN)
		if sz < sn {
			sn = sz
		}
		sample := make([]byte, sn)
		if sn > 0 {
			if _, err := io.ReadFull(tr, sample); err != nil {
				// не смогли прочитать — пропускаем файл
				continue
			}
		}
		if opts.SkipBinaries && filters.IsBinarySample(sample) {
			// слить остаток файла
			if remain := sz - sn; remain > 0 {
				_, _ = io.CopyN(io.Discard, tr, remain)
			}
			continue
		}

		// Теперь готовим построчное чтение:
		//   объединяем (сначала sample, потом остальное тело файла)
		rest := &countReader{R: tr}                             // считаем, сколько дочитали из tar после sample
		reader := io.MultiReader(bytes.NewReader(sample), rest) // повторим sample перед «хвостом»
		sc := bufio.NewScanner(reader)
		// позволим длинные строки (до ~10 МБ)
		sc.Buffer(make([]byte, 0, 64*1024), 10*1024*1024)

		// Собираем первые N строк в буфер (чтобы знать фактическое {n} перед заголовком).
		var buf bytes.Buffer
		lines, truncated := 0, false
		for sc.Scan() {
			raw := sc.Text()
			// нормализуем CRLF/CR → LF (scanner режет по '\n', поэтому CR останется в конце)
			if strings.HasSuffix(raw, "\r") {
				raw = strings.TrimSuffix(raw, "\r")
			}

			// применим сканер секретов (если включён)
			outLine := raw
			if scanner != nil {
				lineno := lines + 1
				finds := scanner.ScanLine(rel, raw, lineno)
				outLine = scanner.ApplyStrategy(raw, finds)
			}

			lines++
			if opts.LineNumbers {
				fmt.Fprintf(&buf, "%d\t%s\n", lines, outLine)
			} else {
				buf.WriteString(outLine)
				buf.WriteByte('\n')
			}

			// достигли лимита строк?
			if opts.MaxLinesPerFile > 0 && lines >= opts.MaxLinesPerFile {
				truncated = true
				break
			}
		}
		// если мы оборвали чтение, нужно слить остаток файла до конца,
		// чтобы корректно перейти к следующему заголовку
		consumedFromTar := sn + rest.N // сколько байтов тела файла съели у tar
		if remain := sz - consumedFromTar; remain > 0 {
			_, _ = io.CopyN(io.Discard, tr, remain)
		}
		// если сканер упал с ошибкой — пропустим файл
		if err := sc.Err(); err != nil {
			continue
		}

		// Заголовок с фактическим количеством строк {n}
		header := strings.ReplaceAll(opts.HeaderTemplate, "{path}", rel)
		header = strings.ReplaceAll(header, "{n}", strconv.Itoa(lines))
		if err := write([]byte(header + "\n")); err != nil {
			return err
		}
		// Текст файла (первые N строк)
		if err := write(buf.Bytes()); err != nil {
			return err
		}
		// Признак обрезки
		if truncated {
			if err := write([]byte("… (truncated)\n")); err != nil {
				return err
			}
		}
		// пустая строка между файлами
		if err := write([]byte("\n")); err != nil {
			return err
		}
	}
	return nil
}

// countReader — считает, сколько байт было прочитано (нужно, чтобы потом докатать остаток файла).
type countReader struct {
	R io.Reader
	N int64
}

func (c *countReader) Read(p []byte) (int, error) {
	n, err := c.R.Read(p)
	c.N += int64(n)
	return n, err
}
