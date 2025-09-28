package storepg

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const schemaInitSQL = `
CREATE TABLE IF NOT EXISTS exports (
  id                TEXT PRIMARY KEY,
  user_id           TEXT,
  project_id        TEXT,
  owner             TEXT NOT NULL,
  repo              TEXT NOT NULL,
  ref               TEXT NOT NULL,
  options           JSONB NOT NULL,
  status            TEXT NOT NULL,
  progress          INTEGER NOT NULL DEFAULT 0,
  failure_reason    TEXT,
  cancel_requested  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at        TIMESTAMPTZ,
  finished_at       TIMESTAMPTZ,
  idem_key          TEXT NOT NULL UNIQUE,
  profile           TEXT,
  format            TEXT
);

CREATE INDEX IF NOT EXISTS idx_exports_created ON exports (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exports_status  ON exports (status);

CREATE TABLE IF NOT EXISTS artifacts (
  id           BIGSERIAL PRIMARY KEY,
  export_id    TEXT NOT NULL REFERENCES exports(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  path         TEXT NOT NULL,
  content_type TEXT,
  size         BIGINT,
  checksum     TEXT,
  meta         JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_artifacts_export ON artifacts (export_id);
`

func ensureSchema(ctx context.Context, pool *pgxpool.Pool) error {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	_, err := pool.Exec(ctx, schemaInitSQL)
	return err
}
