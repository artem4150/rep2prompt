package storepg

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/yourname/cleanhttp/internal/jobs"
	"github.com/yourname/cleanhttp/internal/store"
)

// ExportsPG — реализация store.ExportsRepo на Postgres.
type ExportsPG struct {
	pool *pgxpool.Pool
}

// New создает пул соединений к Postgres и делает ping.
func New(ctx context.Context, dbURL string) (*ExportsPG, error) {
	cfg, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		return nil, err
	}
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	ctxPing, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(ctxPing); err != nil {
		pool.Close()
		return nil, err
	}
	if err := ensureSchema(ctx, pool); err != nil {
		pool.Close()
		return nil, err
	}

	return &ExportsPG{pool: pool}, nil
}

func (r *ExportsPG) Close() { r.pool.Close() }

func (r *ExportsPG) CreateOrReuse(ctx context.Context, exp *store.Export) (*store.Export, bool, error) {
	const q = `
INSERT INTO exports
  (id, user_id, project_id, owner, repo, ref, options, status, progress, failure_reason, cancel_requested, idem_key, profile, format)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,$11,$12,$13)
ON CONFLICT (idem_key) DO UPDATE SET idem_key = excluded.idem_key
RETURNING id, user_id, project_id, owner, repo, ref, options, status, progress, failure_reason, cancel_requested, created_at, started_at, finished_at, idem_key, profile, format;
`
	optsJSON, err := json.Marshal(exp.Options)
	if err != nil {
		return nil, false, err
	}

	var (
		res        store.Export
		optionsRaw []byte
		statusText string
		profile    string
		fmtS       string
	)
	row := r.pool.QueryRow(ctx, q,
		exp.ID, exp.UserID, exp.ProjectID, exp.Owner, exp.Repo, exp.Ref,
		optsJSON, string(exp.Status), exp.Progress, exp.FailureReason,
		exp.Options.IdempotencyKey, exp.Options.Profile, exp.Options.Format,
	)
	if err := row.Scan(
		&res.ID, &res.UserID, &res.ProjectID, &res.Owner, &res.Repo, &res.Ref,
		&optionsRaw, &statusText, &res.Progress, &res.FailureReason, &res.CancelRequested,
		&res.CreatedAt, &res.StartedAt, &res.FinishedAt, &res.Options.IdempotencyKey, &profile, &fmtS,
	); err != nil {
		return nil, false, err
	}
	if err := json.Unmarshal(optionsRaw, &res.Options); err != nil {
		return nil, false, err
	}
	res.Status = jobs.Status(statusText)
	res.Options.Profile = profile
	res.Options.Format = fmtS

	reused := res.ID != exp.ID // если вернулся «чужой» id — значит конфликт по idem_key и запись уже была
	return &res, reused, nil
}

func (r *ExportsPG) GetByID(ctx context.Context, id string) (*store.Export, bool, error) {
	const q = `SELECT id, user_id, project_id, owner, repo, ref, options, status, progress, failure_reason,
	                cancel_requested, created_at, started_at, finished_at, idem_key, profile, format
	           FROM exports WHERE id = $1`
	var (
		res        store.Export
		optionsRaw []byte
		statusText string
		profile    string
		fmtS       string
	)
	row := r.pool.QueryRow(ctx, q, id)
	if err := row.Scan(
		&res.ID, &res.UserID, &res.ProjectID, &res.Owner, &res.Repo, &res.Ref,
		&optionsRaw, &statusText, &res.Progress, &res.FailureReason, &res.CancelRequested,
		&res.CreatedAt, &res.StartedAt, &res.FinishedAt, &res.Options.IdempotencyKey, &profile, &fmtS,
	); err != nil {
		return nil, false, err
	}
	if err := json.Unmarshal(optionsRaw, &res.Options); err != nil {
		return nil, false, err
	}
	res.Status = jobs.Status(statusText)
	res.Options.Profile = profile
	res.Options.Format = fmtS
	return &res, true, nil
}

func (r *ExportsPG) UpdateStatus(ctx context.Context, id string, st jobs.Status, progress int, failureReason *string) error {
	const q = `
UPDATE exports SET
  status = $2,
  progress = CASE
                WHEN $3 < 0 THEN progress
                WHEN $2 IN ('error','cancelled') AND $3 < progress THEN progress
                ELSE $3
             END,
  failure_reason = $4,
  started_at = COALESCE(started_at, CASE WHEN $2 = 'running' THEN NOW() ELSE NULL END),
  finished_at = CASE WHEN $2 IN ('done','error','cancelled') THEN NOW() ELSE finished_at END
WHERE id = $1`
	ct, err := r.pool.Exec(ctx, q, id, string(st), progress, failureReason)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return errors.New("export not found")
	}
	return nil
}

func (r *ExportsPG) AddArtifact(ctx context.Context, exportID string, art store.ArtifactMeta) error {
	const q = `
INSERT INTO artifacts(export_id, name, path, content_type, size, checksum, meta, created_at)
VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())`
	var metaJSON []byte
	var err error
	if art.Meta != nil {
		metaJSON, err = json.Marshal(art.Meta)
		if err != nil {
			return err
		}
	}
	_, err = r.pool.Exec(ctx, q, exportID, art.Name, art.Path, art.ContentType, art.Size, art.Checksum, metaJSON)
	return err
}

func (r *ExportsPG) RequestCancel(ctx context.Context, id string) (bool, error) {
	const q = `UPDATE exports SET cancel_requested = true WHERE id = $1 AND cancel_requested = false`
	tag, err := r.pool.Exec(ctx, q, id)
	return tag.RowsAffected() > 0, err
}

func (r *ExportsPG) IsCancelRequested(ctx context.Context, id string) (bool, error) {
	const q = `SELECT cancel_requested FROM exports WHERE id = $1`
	var v bool
	if err := r.pool.QueryRow(ctx, q, id).Scan(&v); err != nil {
		return false, err
	}
	return v, nil
}
