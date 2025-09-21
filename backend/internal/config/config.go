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
	EnvDev Env = "dev"
	EnvProd Env = "prod"
	EnvTest Env = "test"
)

type Config struct{
	Port string
	GitHubToken string
	RequestTimeout time.Duration
	Env            Env          
}

func Load() (Config, error){
	cfg := Config{
		Port: "8080",
		RequestTimeout: 15* time.Second,
		Env: EnvDev,
	}

	if v := os.Getenv("PORT"); v != ""{
		cfg.Port = v
	}

	if v:= os.Getenv("GITHUB_TOKEN"); v != ""{
		cfg.GitHubToken = v
	}

	if v := os.Getenv("REQUEST_TIMEOUT"); v != ""{
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

	if err := validatePort(cfg.Port); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func validatePort(p string) error {
	n, err := strconv.Atoi(p)
	if err != nil || n<1 || n>65535{
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