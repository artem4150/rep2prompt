package store

import "testing"

func TestCreateOrReuseGeneratesKeyForEmptyIdempotency(t *testing.T) {
	s := NewExportsMem("exp")

	exp1, reused := s.CreateOrReuse("owner", "repo", "main", ExportOptions{})
	if reused {
		t.Fatalf("expected first export to be new")
	}
	if exp1.Options.IdempotencyKey == "" {
		t.Fatalf("expected idempotency key to be generated")
	}
	if exp1.Options.IdempotencyKey != exp1.ID {
		t.Fatalf("expected generated key to match export id, got %q vs %q", exp1.Options.IdempotencyKey, exp1.ID)
	}

	exp2, reused := s.CreateOrReuse("owner", "repo", "main", ExportOptions{})
	if reused {
		t.Fatalf("expected second export with empty key to be treated as new")
	}
	if exp2.ID == exp1.ID {
		t.Fatalf("expected different export ids for distinct requests")
	}
	if exp2.Options.IdempotencyKey != exp2.ID {
		t.Fatalf("expected generated key for second export to match its id")
	}
}

func TestCreateOrReuseTrimsAndReusesExplicitIdempotencyKey(t *testing.T) {
	s := NewExportsMem("exp")

	first, reused := s.CreateOrReuse("owner", "repo", "main", ExportOptions{IdempotencyKey: "  custom-key  "})
	if reused {
		t.Fatalf("expected first export with explicit key to be new")
	}
	if want, got := "custom-key", first.Options.IdempotencyKey; want != got {
		t.Fatalf("expected key %q, got %q", want, got)
	}

	second, reused := s.CreateOrReuse("owner", "repo", "main", ExportOptions{IdempotencyKey: "custom-key"})
	if !reused {
		t.Fatalf("expected export to be reused when key matches")
	}
	if first.ID != second.ID {
		t.Fatalf("expected same export id for reused export")
	}
}
