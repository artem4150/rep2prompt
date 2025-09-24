package exporter

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"sort"
	"testing"
)

func makeTarGz(files map[string]string) []byte {
	var buf bytes.Buffer
	gz := gzip.NewWriter(&buf)
	tw := tar.NewWriter(gz)
	for p, content := range files {
		b := []byte(content)
		_ = tw.WriteHeader(&tar.Header{
			Name: "repo-sha/" + p, Mode: 0644, Size: int64(len(b)),
			Typeflag: tar.TypeReg,
		})
		_, _ = tw.Write(b)
	}
	_ = tw.Close()
	_ = gz.Close()
	return buf.Bytes()
}

func TestBuildZip_IncludeExcludeAndStrip(t *testing.T) {
	src := makeTarGz(map[string]string{
		"src/keep.txt":       "hello",
		"src/skip.log":       "nope",
		"docs/readme.md":     "doc",
		"node_modules/x.js":  "var x=1;",
		"nested/inner/test":  "data",
		"nested/inner/test2": "data",
	})
	var out bytes.Buffer
	opts := Options{
		IncludeGlobs:  []string{"**/*.txt", "docs/**"},
		ExcludeGlobs:  []string{"**/*.log", "nested/**"},
		StripFirstDir: true,
		MaxExportMB:   10,
	}
	if err := BuildZipFromTarGz(bytes.NewReader(src), &out, opts); err != nil {
		t.Fatalf("build zip: %v", err)
	}
	names := zipEntries(t, out.Bytes())
	want := []string{"docs/readme.md", "src/keep.txt"}
	sort.Strings(names)
	sort.Strings(want)
	if len(names) != len(want) {
		t.Fatalf("unexpected entries: got %v", names)
	}
	for i, w := range want {
		if names[i] != w {
			t.Fatalf("entry %d mismatch: want %q got %q", i, w, names[i])
		}
	}
}

func TestBuildZip_TooLargeLimit(t *testing.T) {
	big := bytes.Repeat([]byte("a"), 2*1024*1024)
	src := makeTarGz(map[string]string{"big.bin": string(big)})
	var out bytes.Buffer
	err := BuildZipFromTarGz(bytes.NewReader(src), &out, Options{StripFirstDir: true, MaxExportMB: 1})
	if err == nil {
		t.Fatalf("expected error")
	}
	if err != ErrExportTooLarge {
		t.Fatalf("unexpected error: %v", err)
	}
}

func zipEntries(t *testing.T, data []byte) []string {
	t.Helper()
	rdr := bytes.NewReader(data)
	zr, err := zip.NewReader(rdr, int64(len(data)))
	if err != nil {
		t.Fatalf("open zip: %v", err)
	}
	names := make([]string, 0, len(zr.File))
	for _, f := range zr.File {
		names = append(names, f.Name)
	}
	return names
}
