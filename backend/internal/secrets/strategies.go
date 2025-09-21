package secrets

// Strategy — как обрабатывать найденные секреты.
type Strategy int

const (
	// StrategyRedacted — заменить на <REDACTED:RuleID>.
	StrategyRedacted Strategy = iota
	// StrategyStrip — удалить строку (заменить на "# <STRIPPED:RuleID>").
	StrategyStrip
	// StrategyMark — обернуть в <<SECRET:RuleID>>...<<END>> (для ручной проверки).
	StrategyMark
)

// Config — настройки сканера.
type Config struct {
	Strategy Strategy
	// При необходимости сюда можно добавить white/black-list путей, уровни логирования и т. п.
}
