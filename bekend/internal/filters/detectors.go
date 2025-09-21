package filters

import (
	"unicode/utf8"
)

// IsBinarySample — грубая эвристика «бинарник или текст» по сэмплу.
// Правила:
//  • наличие NUL-байта → бинарник;
//  • слишком много «подозрительных» одиночных байт → бинарник;
//  • валидные UTF-8 последовательности считаем текстом.
func IsBinarySample(sample []byte) bool {
	if len(sample) == 0 {
		return false
	}
	// быстрый признак — NUL
	for _, b := range sample {
		if b == 0x00 {
			return true
		}
	}

	// считаем долю «плохих» байтов (не ASCII-печатаемые, не \r\n\t,
	// и не начало валидной UTF-8 руны)
	var bad, total int
	for i := 0; i < len(sample); {
		total++
		r, size := utf8.DecodeRune(sample[i:])
		if r == utf8.RuneError && size == 1 {
			// одиночный битый байт
			b := sample[i]
			// разрешаем таб/переводы строк
			if b != '\n' && b != '\r' && b != '\t' && (b < 32 || b == 127) {
				bad++
			}
			i++
			continue
		}
		// валидная руна — ок (в т.ч. нестандартные символы)
		i += size
	}
	// если >30% плохих байтов — считаем бинарником
	return bad*100/total > 30
}

// IsTooLarge — удобная обёртка: больше, чем maxMB мегабайт?
func IsTooLarge(sizeBytes int64, maxMB int) bool {
	if maxMB <= 0 {
		return false
	}
	limit := int64(maxMB) * 1024 * 1024
	return sizeBytes > limit
}
