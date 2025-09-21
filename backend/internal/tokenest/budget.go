package tokenest

// Planner — рассчитывает бюджет: total / reserve / usable.
type Planner struct {
	Models *Registry
	// Фолбэки для профилей, если модель не найдена
	FallbackShort int // напр. 50000
	FallbackFull  int // напр. 200000
	DefaultReservePct int // напр. 10
}

func NewPlanner(models *Registry) *Planner {
	return &Planner{
		Models:            models,
		FallbackShort:     50000,
		FallbackFull:      200000,
		DefaultReservePct: 10,
	}
}

// Budget(profile, modelID) -> total, reserve, usable
func (p *Planner) Budget(profile string, modelID string) (int, int, int) {
	var total int
	if ms, ok := p.Models.Get(modelID); ok && ms.MaxContextTokens > 0 {
		total = ms.MaxContextTokens - ms.SystemOverheadTokens
		res := ms.DefaultReservePct
		if res <= 0 {
			res = p.DefaultReservePct
		}
		reserve := total * res / 100
		return total, reserve, total - reserve
	}
	// фолбэк по профилю
	switch stringsLower(profile) {
	case "full":
		total = p.FallbackFull
	default:
		total = p.FallbackShort
	}
	reserve := total * p.DefaultReservePct / 100
	return total, reserve, total - reserve
}

func stringsLower(s string) string {
	b := []byte(s)
	for i := range b {
		if 'A' <= b[i] && b[i] <= 'Z' {
			b[i] += 'a' - 'A'
		}
	}
	return string(b)
}
