package exporter

import (
	"archive/tar"     // чтение TAR
	"archive/zip"     // запись ZIP
	"compress/gzip"   // распаковка .tar.gz
	"errors"
	"io"
	"path"
	"strings"

	"github.com/yourname/cleanhttp/internal/filters"
)

// Опции сборки
type Options struct {
	IncludeGlobs     []string // маски include
	ExcludeGlobs     []string // маски exclude
	MaxBinarySizeMB  int      // если файл больше и «бинарный» → пропускаем
	MaxExportMB      int      // общий лимит экспортируемых ДАННЫХ (по размерам файлов из tar)
	MaxFilenameLen   int      // лимит длины имени файла внутри zip (напр. 255)
	StripFirstDir    bool     // срезать первый сегмент (GitHub кладёт repo-<sha>/...)
}

// Ошибки верхнего уровня
var (
	ErrExportTooLarge = errors.New("too_large_export")
	ErrBadName        = errors.New("bad_filename")
)

// BuildZipFromTarGz конвертит .tar.gz поток в ZIP, применяя фильтры.
// Память O(1): читаем файл из tar по кускам и сразу пишем в zip.
func BuildZipFromTarGz(src io.Reader, dst io.Writer, opts Options) error {
	// распаковываем gzip
	gz, err := gzip.NewReader(src)
	if err != nil {
		return err
	}
	defer gz.Close()

	tr := tar.NewReader(gz)       // читаем заголовок → содержимое → заголовок...
	zw := zip.NewWriter(dst)      // записываем ZIP-энTRIES
	defer zw.Close()              // закрываем в конце (важно: пишет центральный каталог)

	var total int64 // суммарный объём экспортируемых файлов (по hdr.Size)

	const sampleN = 8192 // сколько байт читаем для эвристики бинарности

	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			break // конец архива
		}
		if err != nil {
			return err
		}

		// Нас интересуют ТОЛЬКО обычные файлы.
		if hdr.Typeflag != tar.TypeReg {
			continue
		}

		// Имя в tar — вроде "owner-repo-sha/path/to/file".
		name := hdr.Name
		if opts.StripFirstDir {
			if i := strings.IndexByte(name, '/'); i >= 0 {
				name = name[i+1:]
			} else {
				// непонятный путь — пропустим
				continue
			}
		}

		// Нормализуем/проверяем относительный путь.
		rel, err := filters.NormalizeRel(name)
		if err != nil || rel == "" {
			continue // подозрительный путь — пропускаем
		}
		// длина имени (на всякий случай)
		if opts.MaxFilenameLen > 0 && len(rel) > opts.MaxFilenameLen {
			continue // можно считать ErrBadName, но безопаснее просто пропустить
		}

		// Фильтры include/exclude.
		if !filters.Match(rel, opts.IncludeGlobs, opts.ExcludeGlobs) {
			// не проходит по маскам
			// даже если tar огромный — просто «перелистываем» этот файл
			if _, err := io.CopyN(io.Discard, tr, hdr.Size); err != nil && err != io.EOF {
				return err
			}
			continue
		}

		// Общий лимит экспорта по сумме размеров файлов.
		if opts.MaxExportMB > 0 {
			limit := int64(opts.MaxExportMB) * 1024 * 1024
			if total+hdr.Size > limit {
				return ErrExportTooLarge
			}
		}

		// Сэмпл для проверки бинарности (только если задан MaxBinarySizeMB и файл больше).
		var sample []byte
		if opts.MaxBinarySizeMB > 0 && hdr.Size > int64(opts.MaxBinarySizeMB)*1024*1024 {
			n := sampleN
			if hdr.Size < int64(n) {
				n = int(hdr.Size)
			}
			sample = make([]byte, n)
			if _, err := io.ReadFull(tr, sample); err != nil {
				// если внезапно поток закончился — скипаем файл
				continue
			}
			if filters.IsBinarySample(sample) {
				// файл «большой» и выглядит бинарным — пропускаем его полностью
				remain := hdr.Size - int64(len(sample))
				if remain > 0 {
					if _, err := io.CopyN(io.Discard, tr, remain); err != nil && err != io.EOF {
						return err
					}
				}
				continue
			}
		}

		// Готовим ZIP-запись. Используем CreateHeader без указания размера — ZIP сам посчитает.
		zh := &zip.FileHeader{
			Name:   rel,
			Method: zip.Deflate,
		}
		// Обнулим время → стабильные хэши, но это опционально.
		// zh.SetModTime(time.Unix(0, 0))

		w, err := zw.CreateHeader(zh)
		if err != nil {
			return err
		}

		// Сначала пишем сэмпл (если был), затем остаток файла.
		var wrote int64
		if len(sample) > 0 {
			if _, err := w.Write(sample); err != nil {
				return err
			}
			wrote += int64(len(sample))
		}
		remain := hdr.Size - wrote
		if remain > 0 {
			if _, err := io.CopyN(w, tr, remain); err != nil && err != io.EOF {
				return err
			}
		}

		total += hdr.Size
	}

	// закрытие zw в defer
	return nil
}

// (необязательный) маленький помощник для вырезания расширения, если вдруг пригодится
func extLower(p string) string { return strings.ToLower(path.Ext(p)) }
