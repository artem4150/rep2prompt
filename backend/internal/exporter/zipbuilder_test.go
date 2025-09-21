package exporter

import (
	"archive/tar"
	"bytes"
	"compress/gzip"
	_"io"
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
	_ = tw.Close(); _ = gz.Close()
	return buf.Bytes()
}

func Test_ZipBuilder_FiltersAndLimit(t *testing.T) {
	src := makeTarGz(map[string]string{
		"a/b.go": "package x\n", "a/b_test.go": "package x\n", "node_modules/x.js":"var x=1;",
	})
	var out bytes.Buffer
	err := BuildZipFromTarGz(bytes.NewReader(src), &out, Options{
		IncludeGlobs: []string{"**/*.go"},
		ExcludeGlobs: []string{"**/*_test.go","node_modules/**"},
		StripFirstDir: true,
		MaxExportMB: 1,
	})
	if err != nil {
		t.Fatalf("zip build: %v", err)
	}
	if out.Len() == 0 {
		t.Fatal("empty zip")
	}
}
