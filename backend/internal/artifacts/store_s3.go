package artifacts

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"

	minio "github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// S3Config описывает параметры подключения к S3-совместимому хранилищу.
type S3Config struct {
	Endpoint  string
	Region    string
	Bucket    string
	AccessKey string
	SecretKey string
	UseSSL    bool
	Prefix    string
	TTLHours  int
}

type S3Store struct {
	client *minio.Client
	bucket string
	prefix string
	ttl    int
	reSafe *regexp.Regexp
	mu     sync.Mutex
}

// NewS3Store создает Store, сохраняющий артефакты в S3/MinIO.
func NewS3Store(cfg S3Config) (*S3Store, error) {
	if cfg.Bucket == "" {
		return nil, errors.New("s3 bucket is required")
	}
	if cfg.Endpoint == "" {
		return nil, errors.New("s3 endpoint is required")
	}
	if cfg.TTLHours <= 0 {
		cfg.TTLHours = 72
	}

	endpoint := strings.TrimSpace(cfg.Endpoint)
	if endpoint == "" {
		return nil, errors.New("s3 endpoint is required")
	}

	useSSL := cfg.UseSSL
	endpointPrefix := ""
	if strings.Contains(endpoint, "://") {
		u, err := url.Parse(endpoint)
		if err != nil {
			return nil, fmt.Errorf("invalid s3 endpoint: %w", err)
		}
		if u.Host == "" {
			return nil, errors.New("s3 endpoint must include host")
		}
		endpoint = u.Host
		if u.Scheme == "http" {
			useSSL = false
		} else if u.Scheme == "https" {
			useSSL = true
		} else if u.Scheme != "" {
			return nil, fmt.Errorf("unsupported s3 endpoint scheme %q", u.Scheme)
		}
		endpointPrefix = strings.Trim(u.Path, "/")
	}

	if strings.Contains(endpoint, "/") {
		return nil, errors.New("s3 endpoint must not contain path (use S3_PREFIX for prefixes)")
	}

	prefix := strings.Trim(cfg.Prefix, "/")
	if endpointPrefix != "" {
		if prefix != "" {
			prefix = path.Join(endpointPrefix, prefix)
		} else {
			prefix = endpointPrefix
		}
	}
	if prefix != "" {
		prefix = strings.Trim(prefix, "/") + "/"
	}

	opts := &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: useSSL,
	}
	if cfg.Region != "" {
		opts.Region = cfg.Region
	}

	client, err := minio.New(endpoint, opts)
	if err != nil {
		return nil, err
	}

	return &S3Store{
		client: client,
		bucket: cfg.Bucket,
		prefix: prefix,
		ttl:    cfg.TTLHours,
		reSafe: regexp.MustCompile(`^[A-Za-z0-9._\-]+$`),
	}, nil
}

func (s *S3Store) IsSafeID(id string) bool { return s.reSafe.MatchString(id) }

// CreateArtifact подготавливает временный файл и вернет writer, который при
// закрытии загрузит артефакт в S3, обновит manifest и индекс артефакта.
func (s *S3Store) CreateArtifact(exportID, kind, name string) (*ArtifactWriter, ArtifactMeta, error) {
	if exportID == "" || !s.IsSafeID(exportID) {
		return nil, ArtifactMeta{}, fmt.Errorf("invalid exportID")
	}
	if name == "" {
		return nil, ArtifactMeta{}, fmt.Errorf("empty artifact name")
	}

	if err := s.ensureManifest(exportID); err != nil {
		return nil, ArtifactMeta{}, err
	}

	rnd := make([]byte, 16)
	_, _ = rand.Read(rnd)
	artID := "art_" + hex.EncodeToString(rnd)

	tmp, err := os.CreateTemp("", "artifact-*.tmp")
	if err != nil {
		return nil, ArtifactMeta{}, err
	}

	meta := ArtifactMeta{ID: artID, Kind: strings.ToLower(kind), Name: filepath.Base(name)}

	finalize := func(m ArtifactMeta, size int64) (ArtifactMeta, error) {
		m.Size = size
		if err := s.uploadArtifact(exportID, m, tmp.Name()); err != nil {
			return ArtifactMeta{}, err
		}
		if err := s.updateManifest(exportID, m); err != nil {
			return ArtifactMeta{}, err
		}
		if err := s.saveIndex(m, exportID); err != nil {
			return ArtifactMeta{}, err
		}
		_ = os.Remove(tmp.Name())
		return m, nil
	}

	return newArtifactWriter(tmp, meta, finalize), meta, nil
}

func (s *S3Store) uploadArtifact(exportID string, meta ArtifactMeta, path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	_, err = s.client.PutObject(ctx, s.bucket, s.objectKey(exportID, meta.Name), f, meta.Size, minio.PutObjectOptions{
		ContentType: DetectContentType(meta.Name),
	})
	return err
}

func (s *S3Store) updateManifest(exportID string, meta ArtifactMeta) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	mf, err := s.readManifest(exportID)
	if err != nil {
		return err
	}

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
	now := time.Now().UTC()
	mf.GeneratedAt = now
	if mf.TTLHours <= 0 {
		mf.TTLHours = s.ttl
	}
	mf.ExpiresAt = now.Add(time.Duration(mf.TTLHours) * time.Hour)

	data, _ := json.MarshalIndent(mf, "", "  ")
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	_, err = s.client.PutObject(ctx, s.bucket, s.manifestKey(exportID), bytes.NewReader(data), int64(len(data)), minio.PutObjectOptions{ContentType: "application/json"})
	return err
}

func (s *S3Store) ensureManifest(exportID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	_, err := s.client.StatObject(ctx, s.bucket, s.manifestKey(exportID), minio.StatObjectOptions{})
	if err == nil {
		return nil
	}
	if !isNotFound(err) {
		return err
	}

	now := time.Now().UTC()
	mf := Manifest{
		ExportID:    exportID,
		GeneratedAt: now,
		Files:       nil,
		TTLHours:    s.ttl,
		ExpiresAt:   now.Add(time.Duration(s.ttl) * time.Hour),
	}
	data, _ := json.MarshalIndent(mf, "", "  ")
	_, err = s.client.PutObject(ctx, s.bucket, s.manifestKey(exportID), bytes.NewReader(data), int64(len(data)), minio.PutObjectOptions{ContentType: "application/json"})
	return err
}

func (s *S3Store) readManifest(exportID string) (*Manifest, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Minute)
	defer cancel()

	obj, err := s.client.GetObject(ctx, s.bucket, s.manifestKey(exportID), minio.GetObjectOptions{})
	if err != nil {
		return nil, err
	}
	defer obj.Close()

	data, err := io.ReadAll(obj)
	if err != nil {
		return nil, err
	}
	var mf Manifest
	if err := json.Unmarshal(data, &mf); err != nil {
		return nil, err
	}
	return &mf, nil
}

func (s *S3Store) saveIndex(meta ArtifactMeta, exportID string) error {
	idx := struct {
		ExportID string `json:"exportId"`
		Name     string `json:"name"`
	}{ExportID: exportID, Name: meta.Name}

	data, _ := json.Marshal(idx)
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	_, err := s.client.PutObject(ctx, s.bucket, s.indexKey(meta.ID), bytes.NewReader(data), int64(len(data)), minio.PutObjectOptions{ContentType: "application/json"})
	return err
}

func (s *S3Store) loadIndex(artifactID string) (string, string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	obj, err := s.client.GetObject(ctx, s.bucket, s.indexKey(artifactID), minio.GetObjectOptions{})
	if err != nil {
		if isNotFound(err) {
			return "", "", ErrNotFound
		}
		return "", "", err
	}
	defer obj.Close()
	data, err := io.ReadAll(obj)
	if err != nil {
		return "", "", err
	}
	var idx struct {
		ExportID string `json:"exportId"`
		Name     string `json:"name"`
	}
	if err := json.Unmarshal(data, &idx); err != nil {
		return "", "", err
	}
	if idx.ExportID == "" || idx.Name == "" {
		return "", "", ErrNotFound
	}
	return idx.ExportID, idx.Name, nil
}

// OpenByArtifactID загружает артефакт во временный файл и возвращает reader.
func (s *S3Store) OpenByArtifactID(artifactID string) (*os.File, ArtifactMeta, string, error) {
	if !s.IsSafeID(artifactID) {
		return nil, ArtifactMeta{}, "", ErrNotFound
	}

	exportID, name, err := s.loadIndex(artifactID)
	if err != nil {
		return nil, ArtifactMeta{}, "", err
	}

	mf, err := s.readManifest(exportID)
	if err != nil {
		if isNotFound(err) {
			return nil, ArtifactMeta{}, "", ErrNotFound
		}
		return nil, ArtifactMeta{}, "", err
	}

	if time.Now().UTC().After(mf.ExpiresAt) {
		return nil, ArtifactMeta{}, "", ErrExpired
	}

	var meta ArtifactMeta
	found := false
	for _, f := range mf.Files {
		if f.ID == artifactID {
			meta = f
			found = true
			break
		}
	}
	if !found {
		return nil, ArtifactMeta{}, "", ErrNotFound
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	obj, err := s.client.GetObject(ctx, s.bucket, s.objectKey(exportID, name), minio.GetObjectOptions{})
	if err != nil {
		if isNotFound(err) {
			return nil, ArtifactMeta{}, "", ErrNotFound
		}
		return nil, ArtifactMeta{}, "", err
	}
	defer obj.Close()

	tmp, err := os.CreateTemp("", "artifact-read-*.tmp")
	if err != nil {
		return nil, ArtifactMeta{}, "", err
	}

	if _, err := io.Copy(tmp, obj); err != nil {
		tmp.Close()
		_ = os.Remove(tmp.Name())
		return nil, ArtifactMeta{}, "", err
	}
	if _, err := tmp.Seek(0, io.SeekStart); err != nil {
		tmp.Close()
		_ = os.Remove(tmp.Name())
		return nil, ArtifactMeta{}, "", err
	}

	return tmp, meta, exportID, nil
}

// ListByExportID возвращает список артефактов из manifest.
func (s *S3Store) ListByExportID(exportID string) ([]ArtifactMeta, time.Time, error) {
	if !s.IsSafeID(exportID) {
		return nil, time.Time{}, ErrNotFound
	}
	mf, err := s.readManifest(exportID)
	if err != nil {
		if isNotFound(err) {
			return nil, time.Time{}, ErrNotFound
		}
		return nil, time.Time{}, err
	}
	return mf.Files, mf.ExpiresAt, nil
}

func (s *S3Store) objectKey(exportID, name string) string {
	return path.Join(s.prefix+exportID, filepath.Base(name))
}

func (s *S3Store) manifestKey(exportID string) string {
	return path.Join(s.prefix+exportID, "manifest.json")
}

func (s *S3Store) indexKey(artifactID string) string {
	return path.Join(s.prefix+"index", artifactID+".json")
}

func isNotFound(err error) bool {
	resp := minio.ToErrorResponse(err)
	if resp.StatusCode == http.StatusNotFound {
		return true
	}
	switch resp.Code {
	case "NoSuchKey", "NotFound", "NoSuchBucket", "NoSuchObject":
		return true
	default:
		return false
	}
}
