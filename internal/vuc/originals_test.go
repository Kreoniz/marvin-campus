package vuc

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

func originalFixture(t *testing.T, content []byte) (*Store, string, string) {
	t.Helper()
	hash := fmt.Sprintf("%x", sha256.Sum256(content))
	data := fixture()
	entry := &data.Schedules[0]
	entry.ID = "d" + hash[:12] + "-p101"
	entry.DocumentSHA256 = hash
	entry.Lessons = nil
	// Input metadata must never establish original availability.
	entry.OriginalAvailable = true
	second := *entry
	second.ID = "d" + hash[:12] + "-p102"
	data.Schedules = append(data.Schedules, second)
	return parseFixture(t, data), entry.ID, hash
}

func docxFixture(t *testing.T, names ...string) []byte {
	t.Helper()
	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	for _, name := range names {
		file, err := writer.Create(name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := file.Write([]byte("<document/>")); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}

func TestOriginalsVerifyBothFormatsAndPinExactBytes(t *testing.T) {
	for _, extension := range []string{".pdf", ".docx"} {
		t.Run(extension, func(t *testing.T) {
			content := []byte("%PDF-1.7\noriginal bytes\n%%EOF\n")
			expectedType := "application/pdf"
			if extension == ".docx" {
				content = docxFixture(t, "[Content_Types].xml", "word/document.xml")
				expectedType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
			}
			store, id, hash := originalFixture(t, content)
			if store.Search("")[0].OriginalAvailable {
				t.Fatal("dataset claimed an original before verification")
			}
			directory := t.TempDir()
			filename := filepath.Join(directory, hash+extension)
			if err := os.WriteFile(filename, content, 0600); err != nil {
				t.Fatal(err)
			}
			if err := store.LoadOriginals(directory); err != nil {
				t.Fatal(err)
			}
			for _, ref := range store.Search("") {
				week, ok := store.Week(ref.ID, "2026-08-31")
				if !ref.OriginalAvailable || !ok || !week.OriginalAvailable {
					t.Fatal("verified document was not available for each owning platoon")
				}
			}
			if err := os.WriteFile(filename, []byte("replaced after startup"), 0600); err != nil {
				t.Fatal(err)
			}
			original, ok := store.Original(id)
			if !ok || !bytes.Equal(original.Data, content) || original.ContentType != expectedType || original.Filename != "vuc-"+hash[:12]+extension {
				t.Fatal("lost original bytes, safe filename or content type")
			}
			if _, ok := store.Original("d" + hash[:12] + "-p999"); ok {
				t.Fatal("served an unlisted platoon")
			}
			if err := store.LoadOriginals(""); err != nil || store.Search("")[0].OriginalAvailable {
				t.Fatal("empty configuration did not disable downloads")
			}
		})
	}
}

func TestMissingOriginalsRemainUnavailableAndUnlistedFilesAreIgnored(t *testing.T) {
	store, id, _ := originalFixture(t, []byte("%PDF-1.7\noriginal\n"))
	directory := t.TempDir()
	for _, name := range []string{"original.pdf", "not-a-hash.docx"} {
		if err := os.WriteFile(filepath.Join(directory, name), []byte("not a document"), 0600); err != nil {
			t.Fatal(err)
		}
	}
	if err := store.LoadOriginals(directory); err != nil {
		t.Fatal(err)
	}
	week, _ := store.Week(id, "2026-08-31")
	if _, ok := store.Original(id); ok || week.OriginalAvailable || store.Search("")[0].OriginalAvailable {
		t.Fatal("missing original became available")
	}
	if err := store.LoadOriginals(filepath.Join(directory, "missing")); err == nil {
		t.Fatal("accepted a nonexistent configured directory")
	}
	var disabled *Store
	if err := disabled.LoadOriginals(""); err != nil {
		t.Fatal(err)
	}
	if err := disabled.LoadOriginals(directory); err == nil {
		t.Fatal("accepted originals without a dataset allowlist")
	}
}

func TestOriginalsRejectMismatchedHashFormatAndUnsafeFiles(t *testing.T) {
	pdf := []byte("%PDF-1.7\noriginal\n")
	for _, test := range []struct {
		name, extension string
		content         []byte
		change          func(string) error
	}{
		{name: "hash mismatch", extension: ".pdf", content: pdf, change: func(path string) error { return os.WriteFile(path, []byte("%PDF-1.7\nchanged\n"), 0600) }},
		{name: "non PDF", extension: ".pdf", content: []byte("<html>not a PDF</html>")},
		{name: "non DOCX", extension: ".docx", content: pdf},
		{name: "generic ZIP", extension: ".docx", content: docxFixture(t, "other.xml")},
		{name: "directory", extension: ".pdf", content: pdf, change: func(path string) error {
			if err := os.Remove(path); err != nil {
				return err
			}
			return os.Mkdir(path, 0700)
		}},
		{name: "oversized", extension: ".pdf", content: pdf, change: func(path string) error { return os.Truncate(path, MaxOriginalBytes+1) }},
		{name: "symlink outside root", extension: ".pdf", content: pdf, change: func(path string) error {
			outside := filepath.Join(t.TempDir(), "outside.pdf")
			if err := os.WriteFile(outside, pdf, 0600); err != nil {
				return err
			}
			if err := os.Remove(path); err != nil {
				return err
			}
			return os.Symlink(outside, path)
		}},
	} {
		t.Run(test.name, func(t *testing.T) {
			store, _, hash := originalFixture(t, test.content)
			directory := t.TempDir()
			path := filepath.Join(directory, hash+test.extension)
			if err := os.WriteFile(path, test.content, 0600); err != nil {
				t.Fatal(err)
			}
			if test.change != nil {
				if err := test.change(path); err != nil {
					t.Fatal(err)
				}
			}
			if err := store.LoadOriginals(directory); err == nil {
				t.Fatal("accepted unsafe original")
			}
			if store.Search("")[0].OriginalAvailable {
				t.Fatal("failed verification exposed original availability")
			}
		})
	}
}
