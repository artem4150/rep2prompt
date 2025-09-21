package secrets

// Kind — тип секрета.
type Kind string

const (
	KindToken      Kind = "TOKEN"
	KindEnvValue   Kind = "ENV_VALUE"
	KindPrivateKey Kind = "PRIVATE_KEY"
	KindPassword   Kind = "PASSWORD"
	KindJWT        Kind = "JWT"
	KindOther      Kind = "OTHER"
)

// Severity — уровень серьёзности.
type Severity string

const (
	SevLow  Severity = "LOW"
	SevMed  Severity = "MED"
	SevHigh Severity = "HIGH"
)

// Span — диапазон символов в строке [Start, End).
type Span struct{ Start, End int }

// Finding — одно срабатывание правила.
type Finding struct {
	Path     string   // путь файла (относительный)
	LineNo   int      // номер строки (1-based)
	Kind     Kind     // тип секрета
	RuleID   string   // идентификатор правила
	Span     Span     // позиция в строке
	Severity Severity // серьёзность
	Note     string   // пояснение/подсказка
	Value    string   // (не заполняем в отчёте, используется только внутри ApplyStrategy)
}

// SecretReport — агрегированный отчёт.
type SecretReport struct {
	TotalFindings   int
	ByKind          map[Kind]int
	Files           []FileSummary
	AppliedStrategy Strategy
}

type FileSummary struct {
	Path   string
	Count  int
	Kinds  []Kind
	Levels []Severity
}
