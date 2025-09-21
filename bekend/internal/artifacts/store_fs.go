package artifacts

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

// ===== Публичные типы/ошибки =====

var (
	ErrNotFound = errors.New("artifact not found")
	ErrExpired  = errors.New("artifact expired")
)

type ArtifactMeta struct {
	ID   string `json:"id"`
	Kind string `json:"kind"` // md|zip|txt
	Name string `json:"name"`
	Size int64  `json:"size"`
}

type Manifest struct {
	ExportID    string         `json:"exportId"`
	GeneratedAt time.Time      `json:"generatedAt"`
	Files       []ArtifactMeta `json:"files"`
	TTLHours    int            `json:"ttlHours"`
	ExpiresAt   time.Time      `json:"expiresAt"`
}

type FSStore struct {
	root     string       // корень, например ./data/artifacts
	ttlHours int          // дефолтный TTL для новых manifest
	mu       sync.Mutex   // защищает запись manifest
	reSafeID *regexp.Regexp
}

// NewFSStore создаёт FS-хранилище. Dir будет создан, если его нет.
func NewFSStore(dir string, ttlHours int) *FSStore {
	_ = os.MkdirAll(dir, 0o755)
	return &FSStore{
		root:     dir,
		ttlHours: ttlHours,
		reSafeID: regexp.MustCompile(`^[A-Za-z0-9._\-]+$`),
	}
}

// IsSafeID — грубая проверка exportId/artifactId.
func (s *FSStore) IsSafeID(id string) bool { return s.reSafeID.MatchString(id) }

// ===== Создание артефакта =====

// ArtifactWriter — io.WriteCloser, который по Close() обновляет manifest.
type ArtifactWriter struct {
	f        *os.File
	store    *FSStore
	exportID string
	meta     ArtifactMeta
}

// Close закрывает файл и фиксирует размер в manifest.json.
func (aw *ArtifactWriter) Close() error {
	if err := aw.f.Close(); err != nil {
		return err
	}
	fi, err := os.Stat(aw.f.Name())
	if err != nil {
		return err
	}
	aw.meta.Size = fi.Size()
	return aw.store.updateManifest(aw.exportID, aw.meta)
}

// CreateArtifact создаёт файл <root>/<exportId>/<name> и вернёт writer + метаданные.
// kind: "zip"|"md"|"txt" — влияет на Content-Type и удобочитаемость.
// name: имя файла в каталоге exportId (например, "bundle.zip").
func (s *FSStore) CreateArtifact(exportID, kind, name string) (*ArtifactWriter, ArtifactMeta, error) {
	if exportID == "" || !s.IsSafeID(exportID) {
		return nil, ArtifactMeta{}, fmt.Errorf("invalid exportID")
	}
	if name == "" {
		return nil, ArtifactMeta{}, fmt.Errorf("empty artifact name")
	}
	// генерим длинный стабильно-случайный id
	rnd := make([]byte, 16)
	_, _ = rand.Read(rnd)
	artID := "art_" + hex.EncodeToString(rnd)

	dir := filepath.Join(s.root, exportID)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, ArtifactMeta{}, err
	}
	full := filepath.Join(dir, filepath.Base(name)) // защита от ../
	f, err := os.Create(full)
	if err != nil {
		return nil, ArtifactMeta{}, err
	}
	meta := ArtifactMeta{ID: artID, Kind: strings.ToLower(kind), Name: filepath.Base(name), Size: 0}
	// убедимся, что есть манифест (с дефолтным TTL)
	if err := s.ensureManifest(exportID); err != nil {
		_ = f.Close()
		return nil, ArtifactMeta{}, err
	}
	return &ArtifactWriter{f: f, store: s, exportID: exportID, meta: meta}, meta, nil
}

// ===== Чтение/листы =====

// OpenByArtifactID возвращает поток файла + мету и проверяет TTL.
// ВАЖНО: мы ищем артефакт по всем exportId внутри root (MVP).
func (s *FSStore) OpenByArtifactID(artifactID string) (file *os.File, meta ArtifactMeta, exportID string, err error) {
	if !s.IsSafeID(artifactID) {
		return nil, ArtifactMeta{}, "", ErrNotFound
	}
	entries, _ := os.ReadDir(s.root)
	now := time.Now().UTC()
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		expID := e.Name()
		mf, mErr := s.readManifest(expID)
		if mErr != nil {
			continue
		}
		if now.After(mf.ExpiresAt) {
			continue // протухло
		}
		for _, f := range mf.Files {
			if f.ID == artifactID {
				full := filepath.Join(s.root, expID, f.Name)
				fp, oErr := os.Open(full)
				if oErr != nil {
					return nil, ArtifactMeta{}, "", oErr
				}
				return fp, f, expID, nil
			}
		}
	}
	return nil, ArtifactMeta{}, "", ErrNotFound
}

// ListByExportID читает manifest.json и возвращает список файлов + expiresAt.
func (s *FSStore) ListByExportID(exportID string) (files []ArtifactMeta, expiresAt time.Time, err error) {
	if !s.IsSafeID(exportID) {
		return nil, time.Time{}, ErrNotFound
	}
	mf, err := s.readManifest(exportID)
	if err != nil {
		return nil, time.Time{}, err
	}
	return mf.Files, mf.ExpiresAt, nil
}

// DetectContentType — по имени (расширению).
func DetectContentType(name string) string {
	ext := strings.ToLower(filepath.Ext(name))
	if ext == "" {
		return "application/octet-stream"
	}
	if ct := mime.TypeByExtension(ext); ct != "" {
		// принудительно добавим charset для текстовых
		if strings.HasPrefix(ct, "text/") && !strings.Contains(ct, "charset") {
			return ct + "; charset=utf-8"
		}
		return ct
	}
	switch ext {
	case ".md", ".txt":
		return "text/plain; charset=utf-8"
	default:
		return "application/octet-stream"
	}
}

// ===== Manifest / TTL / GC =====

func (s *FSStore) manifestPath(exportID string) string {
	return filepath.Join(s.root, exportID, "manifest.json")
}

func (s *FSStore) ensureManifest(exportID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	mp := s.manifestPath(exportID)
	if _, err := os.Stat(mp); err == nil {
		return nil
	}
	now := time.Now().UTC()
	mf := Manifest{
		ExportID:    exportID,
		GeneratedAt: now,
		Files:       nil,
		TTLHours:    s.ttlHours,
		ExpiresAt:   now.Add(time.Duration(s.ttlHours) * time.Hour),
	}
	b, _ := json.MarshalIndent(mf, "", "  ")
	return os.WriteFile(mp, b, 0o644)
}

func (s *FSStore) readManifest(exportID string) (*Manifest, error) {
	mp := s.manifestPath(exportID)
	b, err := os.ReadFile(mp)
	if err != nil {
		return nil, err
	}
	var mf Manifest
	if err := json.Unmarshal(b, &mf); err != nil {
		return nil, err
	}
	return &mf, nil
}

func (s *FSStore) updateManifest(exportID string, meta ArtifactMeta) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	mp := s.manifestPath(exportID)
	var mf Manifest
	b, err := os.ReadFile(mp)
	if err != nil {
		return err
	}
	if err := json.Unmarshal(b, &mf); err != nil {
		return err
	}
	// Replace/append file
	replaced := false
	for i := range mf.Files {
		if mf.Files[i].ID == meta.ID {
			mf.Files[i] = meta
			replaced = true
			break
		}
	}
	if !replaced {
		mf.Files = append(mf.Files, meta)
	}
	// Обновим timestamps (GeneratedAt как "последнее изменение манифеста")
	now := time.Now().UTC()
	mf.GeneratedAt = now
	if mf.TTLHours <= 0 {
		mf.TTLHours = s.ttlHours
	}
	mf.ExpiresAt = now.Add(time.Duration(mf.TTLHours) * time.Hour)

	out, _ := json.MarshalIndent(mf, "", "  ")
	return os.WriteFile(mp, out, 0o644)
}

// StartGC — периодически удаляет протухшие артефакты.
func (s *FSStore) StartGC(stop <-chan struct{}, every time.Duration) {
	t := time.NewTicker(every)
	go func() {
		defer t.Stop()
		for {
			select {
			case <-stop:
				return
			case <-t.C:
				s.gcOnce()
			}
		}
	}()
}

func (s *FSStore) gcOnce() {
	entries, _ := os.ReadDir(s.root)
	now := time.Now().UTC()
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		expID := e.Name()
		mf, err := s.readManifest(expID)
		if err != nil {
			continue
		}
		if now.Before(mf.ExpiresAt) {
			continue
		}
		// удаляем папку exportId
		_ = os.RemoveAll(filepath.Join(s.root, expID))
	}
}

// ===== Вспомогательное =====

// StreamCopy — удобно стримить файл в http.ResponseWriter.
func StreamCopy(dst io.Writer, src *os.File) (int64, error) {
	defer src.Close()
	return io.Copy(dst, src)
}
func (aw *ArtifactWriter) Write(p []byte) (int, error) {
	return aw.f.Write(p)
}