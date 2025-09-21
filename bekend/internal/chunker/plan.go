package chunker

// Excerpt — измеренный блок (уже со всеми заголовками/ограждениями кода).
type Excerpt struct {
	Path    string
	Group   string // верхняя папка (apps/web, internal/…, etc.)
	Tokens  int
	Content string
}

// Chunk — собранный чанк.
type Chunk struct {
	ID            int
	Title         string
	Files         []Excerpt
	Tokens        int
	OverlapTokens int
}

// Plan — простой планировщик: byFolder/последовательный, с учётом overlap как оверхеда.
func Plan(excerpts []Excerpt, usableTokens, overlapTokens int) []Chunk {
	if usableTokens <= 0 {
		return nil
	}
	var chunks []Chunk
	nextID := 1
	cur := Chunk{ID: nextID, Title: "CHUNK " + itoa(nextID)}

	flush := func() {
		if len(cur.Files) > 0 {
			chunks = append(chunks, cur)
			nextID++
			cur = Chunk{ID: nextID, Title: "CHUNK " + itoa(nextID)}
		}
	}

	for i, ex := range excerpts {
		need := ex.Tokens
		if cur.Tokens > 0 && overlapTokens > 0 {
			need += overlapTokens
		}
		if cur.Tokens > 0 && cur.Tokens+need > usableTokens {
			flush()
			need = ex.Tokens // в новом чанке для первого файла overlap не добавляем
		}
		cur.Files = append(cur.Files, ex)
		cur.Tokens += need
		if i == len(excerpts)-1 {
			flush()
		}
	}
	return chunks
}

func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}
