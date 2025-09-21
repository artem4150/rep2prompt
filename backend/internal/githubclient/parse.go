package githubclient

import (
	"errors"     // пакет для создания и возврата ошибок
	"net/url"    // парсер URL для https-ссылок
	"strings"    // работа со строками (обрезка, проверка префиксов/суффиксов)
)

func ParseGitHubURL(raw string) (string, string, error){
	raw = strings.TrimSpace(raw)
	if raw == ""{
		return "", "", errors.New("empty url")
	}

	if strings.HasPrefix(raw, "git@"){
		const prefix = "git@github.com:"
		if !strings.HasPrefix(raw, prefix){
			return "","", errors.New("unsupported ssh host")
		}
		path := strings.TrimPrefix(raw, prefix)
		parts := strings.Split(path, "/")
		if len(parts) != 2 {                    
			return "", "", errors.New("invalid ssh path; expected owner/repo.git")
		}
		owner := parts[0]
		repo := strings.TrimSuffix(parts[1], ".git")
		if owner == "" || repo == "" {            
			return "", "", errors.New("invalid ssh path segments")
		}
		return owner, repo, nil
	}
	
	u, err := url.Parse(raw)

	if err != nil {          
		return "", "", errors.New("invalid url")
	}
	
	if !strings.EqualFold(u.Host,"github.com"){
		return "", "", errors.New("host must be github.com")
	}

		path := strings.TrimPrefix(u.Path, "/") 
	parts := strings.Split(path, "/")       
	if len(parts) != 2 {                    
		return "", "", errors.New("expected two path segments: owner/repo")
	}

	owner := parts[0]                                 
	repo := strings.TrimSuffix(parts[1], ".git")      
	if owner == "" || repo == "" {                     
		return "", "", errors.New("owner or repo missing")
	}
	return owner, repo, nil
}