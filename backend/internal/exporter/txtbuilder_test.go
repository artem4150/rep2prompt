package exporter

import (
	"bytes"
	"strings"
	"testing"
)

func TestBuildTxt_TruncateAndStrip(t *testing.T) {
	src := makeTarGz(map[string]string{
		"path/to/file.txt": "line1\nline2\nline3\nline4\n",
	})
	var out bytes.Buffer
	opts := TxtOptions{
		IncludeGlobs:    []string{"**/*.txt"},
		StripFirstDir:   true,
		MaxLinesPerFile: 2,
		LineNumbers:     false,
	}
	if err := BuildTxtFromTarGz(bytes.NewReader(src), &out, opts); err != nil {
		t.Fatalf("build txt: %v", err)
	}
	result := out.String()
	if !strings.Contains(result, "=== FILE: path/to/file.txt (first 2 lines) ===") {
		t.Fatalf("header missing: %s", result)
	}
	if !strings.Contains(result, "… (truncated)") {
		t.Fatalf("expected truncated marker, got: %s", result)
	}
}

func TestBuildTxt_TooLargeLimit(t *testing.T) {
	big := strings.Repeat("a\n", 600000) // ~1.2MB
	src := makeTarGz(map[string]string{"large.txt": big})
	var out bytes.Buffer
	opts := TxtOptions{StripFirstDir: true, MaxExportMB: 1}
	err := BuildTxtFromTarGz(bytes.NewReader(src), &out, opts)
	if err == nil {
		t.Fatalf("expected error")
	}
	if err != ErrExportTooLarge {
		t.Fatalf("unexpected error: %v", err)
	}
}
