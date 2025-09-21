package httputil

import (
	"encoding/json"
	"io"
	"net/http"

)

const ContentTypeJSON = "application/json; charset=utf-8"

// WriteJSON — успешный ответ.
func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", ContentTypeJSON)
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

type errorBody struct {
	Error struct {
		Code    string                 `json:"code"`
		Message string                 `json:"message"`
		Details map[string]any         `json:"details,omitempty"`
	} `json:"error"`
}

// WriteError — унифицированная ошибка.
func WriteError(w http.ResponseWriter, status int, code, message string, details map[string]any) {
	w.Header().Set("Content-Type", ContentTypeJSON)
	var b errorBody
	b.Error.Code = code
	b.Error.Message = message
	if len(details) > 0 {
		b.Error.Details = details
	}
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(b)
}

// DecodeJSON — безопасное чтение тела запроса в v (лимит 1 MiB).
func DecodeJSON(r *http.Request, v any) error {
	const maxBody = 1 << 20 // 1MiB
	defer r.Body.Close()
	lr := &io.LimitedReader{R: r.Body, N: maxBody}
	dec := json.NewDecoder(lr)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

// isReadme — распознаёт README файлы разных форм.

