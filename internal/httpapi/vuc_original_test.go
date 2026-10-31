package httpapi

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"mime"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"marvin-campus/internal/schedule"
	"marvin-campus/internal/vuc"
)

func originalStore(t *testing.T, content []byte, extension string, configure bool) (*vuc.Store, string, string) {
	t.Helper()
	hash := fmt.Sprintf("%x", sha256.Sum256(content))
	id := "d" + hash[:12] + "-p101"
	day := schedule.Monday(time.Now().UTC()).Format("2006-01-02")
	data := vuc.Dataset{Version: 1, ImportedAt: time.Now().UTC().Format(time.RFC3339), Schedules: []vuc.Entry{{Ref: vuc.Ref{Kind: "vuc", ID: id, Label: "ВУЦ 101", Description: "Учебный документ", FirstDate: day, LastDate: day}, DocumentSHA256: hash, SourceLabel: "Учебный документ", SourcePeriod: day, CoveredDates: []string{day}}}}
	body, err := json.Marshal(data)
	if err != nil {
		t.Fatal(err)
	}
	store, err := vuc.Parse(body)
	if err != nil {
		t.Fatal(err)
	}
	if configure {
		directory := t.TempDir()
		if err := os.WriteFile(filepath.Join(directory, hash+extension), content, 0600); err != nil {
			t.Fatal(err)
		}
		if err := store.LoadOriginals(directory); err != nil {
			t.Fatal(err)
		}
	}
	return store, id, day
}

func TestVucOriginalDownloadsExactBytesAndContentTypes(t *testing.T) {
	var buffer bytes.Buffer
	writer := zip.NewWriter(&buffer)
	for _, name := range []string{"[Content_Types].xml", "word/document.xml"} {
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
	for _, test := range []struct {
		extension, contentType string
		content                []byte
	}{
		{".pdf", "application/pdf", []byte("%PDF-1.7\noriginal bytes\n%%EOF\n")},
		{".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer.Bytes()},
	} {
		t.Run(test.extension, func(t *testing.T) {
			store, id, day := originalStore(t, test.content, test.extension, true)
			handler := (&Server{Location: time.UTC, VUC: store}).Handler()
			path := "/api/vuc/" + id + "/original"
			r := httptest.NewRecorder()
			handler.ServeHTTP(r, httptest.NewRequest("GET", path+"?path=/etc/passwd", nil))
			if r.Code != 200 || !bytes.Equal(r.Body.Bytes(), test.content) || r.Header().Get("Content-Type") != test.contentType || r.Header().Get("X-Content-Type-Options") != "nosniff" || r.Header().Get("Cache-Control") != "no-store" {
				t.Fatalf("incorrect download response: status %d, headers %v", r.Code, r.Header())
			}
			disposition, params, err := mime.ParseMediaType(r.Header().Get("Content-Disposition"))
			if err != nil || disposition != "attachment" || params["filename"] != "vuc-"+id[1:13]+test.extension {
				t.Fatal("unsafe download filename or disposition")
			}
			r = httptest.NewRecorder()
			handler.ServeHTTP(r, httptest.NewRequest("HEAD", path, nil))
			if r.Code != 200 || r.Body.Len() != 0 || r.Header().Get("Content-Length") != strconv.Itoa(len(test.content)) {
				t.Fatal("HEAD did not describe the complete original")
			}
			r = httptest.NewRecorder()
			request := httptest.NewRequest("GET", path, nil)
			request.Header.Set("Range", "bytes=0-4")
			handler.ServeHTTP(r, request)
			if r.Code != 206 || !bytes.Equal(r.Body.Bytes(), test.content[:5]) {
				t.Fatal("range download changed original bytes")
			}
			for _, path := range []string{"/api/vuc", "/api/vuc/" + id + "?week=" + day} {
				r = httptest.NewRecorder()
				handler.ServeHTTP(r, httptest.NewRequest("GET", path, nil))
				if r.Code != 200 || !strings.Contains(r.Body.String(), `"originalAvailable":true`) {
					t.Fatal("API metadata did not expose verified original")
				}
			}
		})
	}
}

func TestVucOriginalMissingMalformedAndDisabledRoutesFailClosed(t *testing.T) {
	content := []byte("%PDF-1.7\noriginal\n")
	store, id, _ := originalStore(t, content, ".pdf", true)
	missing, _, day := originalStore(t, content, ".pdf", false)
	for _, path := range []string{"/api/vuc", "/api/vuc/" + id + "?week=" + day} {
		r := httptest.NewRecorder()
		(&Server{Location: time.UTC, VUC: missing}).Handler().ServeHTTP(r, httptest.NewRequest("GET", path, nil))
		if r.Code != 200 || !strings.Contains(r.Body.String(), `"originalAvailable":false`) {
			t.Fatal("missing original did not explicitly clear cached availability")
		}
	}
	for _, test := range []struct {
		name, method, path string
		store              *vuc.Store
		status             int
	}{
		{"disabled", "GET", "/api/vuc/" + id + "/original", nil, 503},
		{"missing original", "GET", "/api/vuc/" + id + "/original", missing, 404},
		{"unknown platoon", "GET", "/api/vuc/daaaaaaaaaaaa-p999/original", store, 404},
		{"malformed ID", "GET", "/api/vuc/bad/original", store, 400},
		{"encoded traversal", "GET", "/api/vuc/%2e%2e/original", store, 400},
		{"encoded slash", "GET", "/api/vuc/%2fetc%2fpasswd/original", store, 400},
		{"missing ID", "GET", "/api/vuc/original", store, 400},
		{"extra path", "GET", "/api/vuc/" + id + "/original/private.pdf", store, 404},
		{"unsupported method", "POST", "/api/vuc/" + id + "/original", store, 405},
	} {
		t.Run(test.name, func(t *testing.T) {
			r := httptest.NewRecorder()
			handler := (&Server{Location: time.UTC, VUC: test.store}).Handler()
			handler.ServeHTTP(r, httptest.NewRequest(test.method, test.path, nil))
			if r.Code != test.status || bytes.Contains(r.Body.Bytes(), content) || r.Header().Get("Content-Disposition") != "" {
				t.Fatalf("unsafe missing/malformed response: status %d, headers %v", r.Code, r.Header())
			}
		})
	}
}
