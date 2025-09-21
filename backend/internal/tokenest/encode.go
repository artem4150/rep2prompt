package tokenest

import (
	"regexp"
	"strings"
	"unicode/utf8"
)

// Estimator — интерфейс MVP-оценки токенов.
type Estimator struct {
	// на будущее: сюда можно положить реальный токенизатор (tiktoken и т. п.)
}

func NewEstimator() *Estimator { return &Estimator{} }

// CountTokens — очень грубая оценка: ~ 1 токен ≈ 4 символа.
// Перед подсчётом нормализуем \r\n -> \n и уберём BOM.
func (e *Estimator) CountTokens(text, modelID string) int {
	norm := normalize(text)
	// «мягкое» разбиение длиннющих строк, чтобы не переоценивать
	norm = softWrap(norm, 2000)
	runes := utf8.RuneCountInString(norm)
	if runes == 0 {
		return 0
	}
	// для не-латиницы/миксов обычно токенов больше — добавим небольшой коэффициент
	nonAscii := nonASCIIShare(norm)
	k := 4.0
	if nonAscii > 0.2 {
		k = 3.2
	}
	// ceil(runes / k)
	toks := int(float64(runes)/k + 0.999)
	if toks < 1 {
		toks = 1
	}
	return toks
}

// CountForFiles — суммарно для нескольких кусочков.
func (e *Estimator) CountForFiles(chunks []string, modelID string) int {
	sum := 0
	for _, s := range chunks {
		sum += e.CountTokens(s, modelID)
	}
	return sum
}

func normalize(s string) string {
	// уберём BOM
	s = strings.TrimPrefix(s, "\uFEFF")
	// CRLF/CR -> LF
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")
	return s
}

func softWrap(s string, max int) string {
	if max <= 0 {
		return s
	}
	var out strings.Builder
	out.Grow(len(s) + len(s)/max)
	line := 0
	for _, r := range s {
		out.WriteRune(r)
		line++
		if line >= max && (r == ' ' || r == ',' || r == ';' || r == '}' || r == ']' || r == ')') {
			out.WriteByte('\n')
			line = 0
		}
	}
	return out.String()
}

var nonASCII = regexp.MustCompile(`[^\x00-\x7F]`)

func nonASCIIShare(s string) float64 {
	if s == "" {
		return 0
	}
	total := len([]rune(s))
	if total == 0 {
		return 0
	}
	n := len(nonASCII.FindAllString(s, -1))
	return float64(n) / float64(total)
}
