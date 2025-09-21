package filters

import (
	"errors"
	"path"
	"regexp"
	"strings"
)

// Match решает, нужно ли пропускать путь по include/exclude маскам.
// Правила:
//  • Пути — относительные POSIX ("src/app/a.ts"), без ведущего "/".
//  • Если includes пуст → включаем всё, КРОМЕ совпавших с excludes.
//  • Отрицательные маски вида "!**/*.test.*" НЕ парсим — передавай их в excludes.
func Match(p string, includes, excludes []string) bool {
	// Нормализуем путь (безопасность и единый формат).
	np, err := NormalizeRel(p)
	if err != nil {
		return false // сломанный путь — не пропускаем
	}

	// Если совпал с любым exclude → выкидываем.
	if matchesAny(np, excludes) {
		return false
	}

	// Если includes пуст → пропускаем всё (мы уже исключили exclude выше).
	if len(includes) == 0 {
		return true
	}

	// Иначе — пропускаем только то, что совпало с include.
	return matchesAny(np, includes)
}

func matchesAny(p string, patterns []string) bool {
	for _, pat := range patterns {
		re := globToRegexp(pat)
		if re.MatchString(p) {
			return true
		}
	}
	return false
}

// NormalizeRel приводит путь к безопасной относительной POSIX-форме.
//  • меняет '\' → '/'; убирает ведущие '/'; path.Clean
//  • запрещает выход наружу (".."), пустую строку.
func NormalizeRel(p string) (string, error) {
	p = strings.TrimSpace(p)
	if p == "" {
		return "", errors.New("empty path")
	}
	// заменяем бэкслеши для Windows
	p = strings.ReplaceAll(p, "\\", "/")
	// запрещаем нулевые байты и управляющие символы
	if strings.ContainsRune(p, '\x00') {
		return "", errors.New("invalid char in path")
	}
	// убираем ведущие "/"
	p = strings.TrimLeft(p, "/")
	// нормализуем (убираем ./ и ../, схлопываем //)
	clean := path.Clean(p) // важно: path из stdlib — POSIX-логика
	// path.Clean(".") возвращает ".", что нам не подходит как файл
	if clean == "." || clean == "" {
		return "", errors.New("invalid clean path")
	}
	// запрет выхода наружу
	if strings.HasPrefix(clean, "../") || strings.Contains(clean, "/../") || clean == ".." {
		return "", errors.New("path escapes root")
	}
	return clean, nil
}

// globToRegexp конвертит простые glob-маски в регулярку.
// Поддержка:
//  • "**" — любой префикс с '/'
//  • "*"  — любые символы, КРОМЕ '/'
//  • "?"  — ровно один символ, КРОМЕ '/'
// Примеры:
//  "**/*.ts"  -> ^(?:.*\/)?[^\/]*\.ts$ (упрощённо)
//  "src/*/a"  -> ^src\/[^\/]*\/a$
//  "a/**/b"   -> ^a\/.*\/b$
func globToRegexp(glob string) *regexp.Regexp {
	var b strings.Builder
	b.WriteString("^")

	esc := func(r rune) {
		// экранируем спецсимволы regex
		if strings.ContainsRune(`.+()|[]{}^$`, r) {
			b.WriteRune('\\')
		}
		b.WriteRune(r)
	}

	runes := []rune(glob)
	for i := 0; i < len(runes); i++ {
		r := runes[i]
		switch r {
		case '*':
			// "**" → .*
			if i+1 < len(runes) && runes[i+1] == '*' {
				b.WriteString(".*")
				i++
			} else {
				// "*" → [^/]* (в пределах сегмента)
				b.WriteString(`[^/]*`)
			}
		case '?':
			// любой один символ, кроме '/'
			b.WriteString(`[^/]`)
		case '.':
			b.WriteString(`\.`) // точка — экранируем
		case '/':
			b.WriteString(`/`) // слэш — как есть
		default:
			esc(r)
		}
	}

	b.WriteString("$")
	// Регулярка компилируется один раз на паттерн (достаточно быстро).
	re := regexp.MustCompile(b.String())
	return re
}
