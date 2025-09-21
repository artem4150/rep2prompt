package secrets

import "regexp"

// rule — внутреннее представление правила.
type rule struct {
	id   string
	kind Kind
	re   *regexp.Regexp
	sev  Severity
	note string
}

// compileRules — минимальный набор правил (MVP).
func compileRules() []rule {
	return []rule{
		// GitHub PAT
		{"github_pat", KindToken, regexp.MustCompile(`\bghp_[A-Za-z0-9]{30,}\b`), SevHigh, "GitHub Personal Access Token"},
		{"github_pat2", KindToken, regexp.MustCompile(`\bgithub_pat_[A-Za-z0-9_]{50,}\b`), SevHigh, "GitHub Fine-grained PAT"},

		// AWS Access Key (ID)
		{"aws_akid", KindToken, regexp.MustCompile(`\bAKIA[0-9A-Z]{16}\b`), SevMed, "AWS Access Key ID"},
		// AWS Secret (эвристика как «длинная base64-подобная») — ловим рядом по ключевым словам
		{"aws_secret", KindToken, regexp.MustCompile(`\bAWS_SECRET_ACCESS_KEY\s*=\s*[A-Za-z0-9/+]{30,}\b`), SevHigh, "AWS Secret Access Key"},

		// Google API Key
		{"google_api", KindToken, regexp.MustCompile(`\bAIza[0-9A-Za-z\-_]{30,}\b`), SevMed, "Google API key"},

		// Stripe
		{"stripe", KindToken, regexp.MustCompile(`\bsk_(?:live|test)_[0-9A-Za-z]{24,}\b`), SevHigh, "Stripe Secret Key"},

		// Slack
		{"slack", KindToken, regexp.MustCompile(`\bxox[abpisr]-[0-9A-Za-z-]{10,}\b`), SevMed, "Slack token"},

		// Twilio
		{"twilio_sk", KindToken, regexp.MustCompile(`\bSK[0-9a-fA-F]{32}\b`), SevMed, "Twilio API Key"},
		{"twilio_ac", KindToken, regexp.MustCompile(`\bAC[0-9a-fA-F]{32}\b`), SevMed, "Twilio Account SID"},

		// JWT (три base64url сегмента через точки)
		{"jwt", KindJWT, regexp.MustCompile(`\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b`), SevMed, "JWT-like token"},

		// ENV пары с подозрительными ключами
		{"env_pair", KindEnvValue, regexp.MustCompile(`(?i)^\s*([A-Z][A-Z0-9_]{2,})\s*=\s*([^\s#].+)$`), SevMed, "ENV pair"},

		// Приватные ключи
		{"pem_key", KindPrivateKey, regexp.MustCompile(`-----BEGIN (?:OPENSSH )?PRIVATE KEY-----`), SevHigh, "Private Key PEM/SSH"},

		// Пароли в коде
		{"password_code", KindPassword, regexp.MustCompile(`(?i)password\s*[:=]\s*["'][^"']{6,}["']`), SevMed, "Password in code"},
	}
}
