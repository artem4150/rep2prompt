package githubclient // тот же пакет, где client.go и parse.go

import (
	"context"   // для передачи дедлайнов/отмены в HTTP
	"fmt"       // форматирование строк (Sprintf)
	"net/http"  // константы статусов
	"path"      // безопасная работа с путями в стиле POSIX (Git всегда '/' )
	"sort"      // стабильная сортировка срезов
	"strings"   // проверки суффиксов/регистров

	// используем уже написанный Client.GetJSON и ошибки ErrNotFound/ErrUpstream/RateLimitedError
)

// TreeItem — нормализованный элемент дерева, который мы отдадим наружу в JSON.
// Поля экспортируемые (с заглавной), но JSON-имена — маленькие (через теги).
type TreeItem struct {
	Path      string `json:"path"`      // полный относительный путь внутри репо (например, "cmd/api/main.go")
	Type      string `json:"type"`      // "file" или "dir"
	Size      int64  `json:"size"`      // для файлов — размер из GitHub; для папок = 0
	LFS       bool   `json:"lfs"`       // эвристика: потенциально хранится в git-lfs
	Submodule bool   `json:"submodule"` // true, если это сабмодуль (в GitHub type=commit)
}

// rawTree — минимальная форма ответа от GitHub на /git/trees/{ref}?recursive=1
// Нас интересует только массив tree и поле type/size/path у элементов.
type rawTree struct {
	Tree []struct {
		Path string  `json:"path"`          // путь в POSIX-формате
		Type string  `json:"type"`          // "blob"|"tree"|"commit"
		Size *int64  `json:"size,omitempty"`// у "tree"/"commit" отсутствует (поэтому *int64)
	} `json:"tree"`
	Truncated bool `json:"truncated"` // GitHub может урезать большие деревья; на V1 просто знаем об этом
}

// GetTree — забирает дерево целиком и нормализует элементы.
// owner/repo — репозиторий; ref — ветка/хеш/тег (например, "main").
// Ошибки: ErrNotFound (404), *RateLimitedError (403/429), ErrUpstream (5xx), либо обычная error.
func (c *Client) GetTree(ctx context.Context, owner, repo, ref string) ([]TreeItem, error) {
	// Строим путь GitHub API:
	// /repos/{owner}/{repo}/git/trees/{ref}?recursive=1 — рекурсивное дерево
	p := fmt.Sprintf("/repos/%s/%s/git/trees/%s?recursive=1", owner, repo, ref)

	// Куда декодировать «сырой» JSON от GitHub.
	var raw rawTree

	// Выполняем запрос через наш helper (он уже умеет обрабатывать rate-limit и базовые коды)
	status, err := c.GetJSON(ctx, p, &raw)
	if err != nil {
		// Прозрачно пробрасываем типизированные ошибки наверх
		if _, ok := err.(*RateLimitedError); ok {
			return nil, err
		}
		if err == ErrNotFound || err == ErrUpstream {
			return nil, err
		}
		// Прочее — обычная ошибка сети/декодера
		return nil, err
	}
	// Дополнительная страховка по статусу (в норме сюда приходят только 2xx)
	if status == http.StatusNotFound {
		return nil, ErrNotFound
	}
	if status >= 500 {
		return nil, ErrUpstream
	}

	// Преобразуем «сырые» элементы в наши TreeItem.
	items := make([]TreeItem, 0, len(raw.Tree)) // ёмкость заранее — чуть экономим аллокации

	for _, t := range raw.Tree {
		switch t.Type {
		case "blob": // обычный файл
			var sz int64
			if t.Size != nil { // у blob size присутствует
				sz = *t.Size
			}
			items = append(items, TreeItem{
				Path:      t.Path,
				Type:      "file",
				Size:      sz,
				LFS:       looksLikeLFS(t.Path, sz), // простая эвристика
				Submodule: false,
			})
		case "tree": // каталог
			items = append(items, TreeItem{
				Path:      t.Path,
				Type:      "dir",
				Size:      0,
				LFS:       false,
				Submodule: false,
			})
		case "commit": // сабмодуль (GitHub так помечает gitlink)
			items = append(items, TreeItem{
				Path:      t.Path,
				Type:      "dir",  // ведём себя как «папка»
				Size:      0,
				LFS:       false,
				Submodule: true,   // но отмечаем, что это сабмодуль
			})
		default:
			// Неизвестный тип — просто пропускаем (на практике редко встречается).
			continue
		}
	}

	// Рекомендовано вернуть «стабильно отсортированное» дерево.
	// Сортируем так: сначала папки, затем файлы; внутри — лексикографически по path.
	sort.SliceStable(items, func(i, j int) bool {
		di := items[i].Type == "dir"
		dj := items[j].Type == "dir"
		if di != dj {
			return di // папки (true) идут раньше файлов (false)
		}
		return items[i].Path < items[j].Path // простой лексикографический порядок
	})

	return items, nil
}

// looksLikeLFS — эвристика: считаем файл «lfs-подобным», если он большой
// или имеет характерное бинарное расширение.
func looksLikeLFS(pth string, size int64) bool {
	// Порог «большого» файла — 5 MiB. Можно потом вынести в конфиг.
	const big = 5 * 1024 * 1024

	// Характерные расширения: картинки/архивы/видео/аудио/исполнимые и т.п.
	ext := strings.ToLower(path.Ext(pth)) // path.Ext — работает с POSIX-путями
	switch ext {
	case ".psd", ".zip", ".rar", ".7z", ".gz", ".tar",
		".bin", ".exe", ".dll",
		".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp",
		".mp3", ".wav", ".flac",
		".mp4", ".mov", ".avi", ".mkv",
		".pdf", ".iso":
		return true
	}
	// Без «подозрительного» расширения ориентируемся на размер.
	return size >= big
}
