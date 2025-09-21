package tokenest

// ModelSpec — лимиты модели.
type ModelSpec struct {
	ID                  string
	MaxContextTokens    int // полный контекст (вся сессия)
	SystemOverheadTokens int // бюджет на системные/служебные токены
	DefaultReservePct   int // резерв под вопросы/инструкции пользователя
}

// Registry — простейший реестр моделей.
type Registry struct {
	byID map[string]ModelSpec
}

func DefaultRegistry() *Registry {
	return &Registry{
		byID: map[string]ModelSpec{
			"openai:gpt-4":    {ID: "openai:gpt-4", MaxContextTokens: 8192, SystemOverheadTokens: 500, DefaultReservePct: 10},
			"openai:gpt-4o":   {ID: "openai:gpt-4o", MaxContextTokens: 128000, SystemOverheadTokens: 1000, DefaultReservePct: 10},
			"deepseek:chat":   {ID: "deepseek:chat", MaxContextTokens: 64000, SystemOverheadTokens: 600, DefaultReservePct: 10},
			"deepseek:coder":  {ID: "deepseek:coder", MaxContextTokens: 200000, SystemOverheadTokens: 1000, DefaultReservePct: 10},
			// добавляй/переопределяй из .env/конфига при инициализации приложения
		},
	}
}

func (r *Registry) Get(id string) (ModelSpec, bool) {
	if r == nil {
		return ModelSpec{}, false
	}
	ms, ok := r.byID[id]
	return ms, ok
}
