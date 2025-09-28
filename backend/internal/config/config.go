package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
	"time"
)

type Env string

const (
	EnvDev  Env = "dev"
	EnvProd Env = "prod"
	EnvTest Env = "test"
)

type Config struct {
	Port              string
	GitHubToken       string
	RequestTimeout    time.Duration
	Env               Env
	DatabaseURL       string
	ArtifactsDir      string
	ArtifactsBackend  string
	ArtifactsTTLHours int
	S3Endpoint        string
	S3Region          string
	S3Bucket          string
	S3AccessKey       string
	S3SecretKey       string
	S3UseSSL          bool
	S3Prefix          string
}

func Load() (Config, error) {
	cfg := Config{
		Port:              "8080",
		RequestTimeout:    15 * time.Second,
		Env:               EnvDev,
		ArtifactsDir:      "./data/artifacts",
		ArtifactsBackend:  "fs",
		ArtifactsTTLHours: 72,
	}
	cfg.DatabaseURL = os.Getenv("DATABASE_URL")
	if v := os.Getenv("PORT"); v != "" {
		cfg.Port = v
	}

	if v := os.Getenv("GITHUB_TOKEN"); v != "" {
		cfg.GitHubToken = v
	}

	if v := os.Getenv("REQUEST_TIMEOUT"); v != "" {
		d, err := time.ParseDuration(v)
		if err != nil {
			return Config{}, errors.New("invalid REQUEST_TIMEOUT (use Go duration, e.g. 15s, 2m)")
		}
		cfg.RequestTimeout = d
	}

	if v := os.Getenv("ENV"); v != "" {
		switch strings.ToLower(v) {
		case "dev":
			cfg.Env = EnvDev
		case "prod", "production":
			cfg.Env = EnvProd
		case "test":
			cfg.Env = EnvTest
		default:
			return Config{}, errors.New("invalid ENV (dev|prod|test)")
		}
	}

	if v := os.Getenv("ARTIFACTS_DIR"); v != "" {
		cfg.ArtifactsDir = v
	}
	if v := os.Getenv("ARTIFACTS_BACKEND"); v != "" {
		cfg.ArtifactsBackend = strings.ToLower(v)
	}
	if v := os.Getenv("ARTIFACTS_TTL_HOURS"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n <= 0 {
			return Config{}, errors.New("invalid ARTIFACTS_TTL_HOURS (must be positive integer)")
		}
		cfg.ArtifactsTTLHours = n
	}

	cfg.S3Endpoint = os.Getenv("S3_ENDPOINT")
	cfg.S3Region = os.Getenv("S3_REGION")
	cfg.S3Bucket = os.Getenv("S3_BUCKET")
	cfg.S3AccessKey = os.Getenv("S3_ACCESS_KEY")
	cfg.S3SecretKey = os.Getenv("S3_SECRET_KEY")
	cfg.S3Prefix = os.Getenv("S3_PREFIX")
	if v := os.Getenv("S3_USE_SSL"); v != "" {
		b, err := strconv.ParseBool(v)
		if err != nil {
			return Config{}, errors.New("invalid S3_USE_SSL (true|false)")
		}
		cfg.S3UseSSL = b
	}

	if err := validatePort(cfg.Port); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func validatePort(p string) error {
	n, err := strconv.Atoi(p)
	if err != nil || n < 1 || n > 65535 {
		return errors.New("invalid PORT (must be 1..65535, digits only)")
	}
	return nil
}

func snapshotEnv(only map[string]string) map[string]*string {
	s := make(map[string]*string, len(only))
	for k := range only {
		if v, ok := os.LookupEnv(k); ok {
			c := v
			s[k] = &c
		} else {
			s[k] = nil // ключа не было — надо будет unset
		}
	}
	return s
}

// restoreEnv — восстанавливает окружение к исходному состоянию.
func restoreEnv(snap map[string]*string) {
	for k, v := range snap {
		if v == nil {
			os.Unsetenv(k)
		} else {
			os.Setenv(k, *v)
		}
	}
}
