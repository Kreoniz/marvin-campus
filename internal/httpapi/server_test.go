package httpapi

import (
	"context"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"marvin-campus/internal/cache"
	"marvin-campus/internal/schedule"
)

func TestSharedPageMetadataWithoutJavaScript(t *testing.T) {
	dir := t.TempDir()
	body := `<html><head><meta property="og:url" content="https://campus.kreoniz.ru/" /><meta property="og:image" content="https://campus.kreoniz.ru/social/og-calendar-v1.jpg" /></head></html>`
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte(body), 0600); err != nil {
		t.Fatal(err)
	}
	handler := (&Server{StaticDir: dir}).Handler()
	r := httptest.NewRecorder()
	request := httptest.NewRequest("GET", "https://untrusted.example/s/abc123?source=ignored", nil)
	request.Header.Set("User-Agent", "TelegramBot (like TwitterBot)")
	handler.ServeHTTP(r, request)
	if r.Code != 200 || !strings.Contains(r.Header().Get("Content-Type"), "text/html") {
		t.Fatalf("wrong HTML response: %d %q", r.Code, r.Header().Get("Content-Type"))
	}
	if !strings.Contains(r.Body.String(), `content="https://campus.kreoniz.ru/s/abc123"`) || strings.Contains(r.Body.String(), "untrusted.example") || strings.Contains(r.Body.String(), "source=ignored") {
		t.Fatalf("wrong public metadata: %s", r.Body.String())
	}
}

func TestManifestMIMEAndWorkerRevalidation(t *testing.T) {
	dir := t.TempDir()
	for name, body := range map[string]string{"manifest.webmanifest": `{"name":"Campus"}`, "sw.js": "self.addEventListener('fetch', () => {});"} {
		if err := os.WriteFile(filepath.Join(dir, name), []byte(body), 0600); err != nil {
			t.Fatal(err)
		}
	}
	handler := (&Server{StaticDir: dir}).Handler()
	for _, path := range []string{"/manifest.webmanifest", "/sw.js"} {
		r := httptest.NewRecorder()
		handler.ServeHTTP(r, httptest.NewRequest("GET", path, nil))
		if r.Code != 200 || r.Header().Get("Cache-Control") != "no-cache" {
			t.Fatalf("%s: status=%d cache=%q", path, r.Code, r.Header().Get("Cache-Control"))
		}
		if path == "/manifest.webmanifest" && r.Header().Get("Content-Type") != "application/manifest+json; charset=utf-8" {
			t.Fatalf("wrong manifest MIME: %q", r.Header().Get("Content-Type"))
		}
	}
}

func TestRoutingAndValidation(t *testing.T) {
	loc, _ := time.LoadLocation("Asia/Omsk")
	s := &Server{Location: loc}
	handler := s.Handler()
	for _, tc := range []struct {
		method, path string
		status       int
	}{
		{"GET", "/api/health", 200}, {"GET", "/api/missing", 404}, {"POST", "/api/health", 405},
		{"GET", "/api/schedule/nope?week=2026-10-12", 400}, {"GET", "/api/schedule/373?week=2026-10-13", 400}, {"GET", "/api/groups?term=X", 400},
	} {
		r := httptest.NewRecorder()
		handler.ServeHTTP(r, httptest.NewRequest(tc.method, tc.path, nil))
		if r.Code != tc.status {
			t.Errorf("%s %s: got %d, want %d", tc.method, tc.path, r.Code, tc.status)
		}
		if tc.method == "GET" && r.Header().Get("Content-Type") != "application/json; charset=utf-8" {
			t.Errorf("non-JSON API response: %s", tc.path)
		}
	}
}

func TestLegacyRefreshParameterCannotBypassFreshCache(t *testing.T) {
	c, err := cache.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	loc, _ := time.LoadLocation("Asia/Omsk")
	now := time.Now().In(loc)
	week := schedule.Monday(now).Format("2006-01-02")
	c.Now = func() time.Time { return now.Add(-20 * time.Minute) }
	_, err = c.Get(context.Background(), "v1:week:373:"+week, schedule.TTL(schedule.Monday(now), now), func(context.Context) ([]byte, error) {
		return []byte(`{"groupId":373,"lessons":[],"subgroups":[]}`), nil
	})
	if err != nil {
		t.Fatal(err)
	}
	c.Now = func() time.Time { return now }
	// No upstream client: an attempted bypass would fail instead of serving data.
	handler := (&Server{Location: loc, Cache: c}).Handler()
	for range 3 {
		r := httptest.NewRecorder()
		handler.ServeHTTP(r, httptest.NewRequest("GET", "/api/schedule/373?week="+week+"&refresh=1", nil))
		if r.Code != 200 {
			t.Fatalf("refresh bypassed TTL: status=%d", r.Code)
		}
	}
}

func TestReadablePageMetadataIncludesOnlyComparisonParameters(t *testing.T) {
	dir := t.TempDir()
	body := `<html><head><meta property="og:url" content="https://campus.kreoniz.ru/" /></head></html>`
	if err := os.WriteFile(filepath.Join(dir, "index.html"), []byte(body), 0600); err != nil {
		t.Fatal(err)
	}
	r := httptest.NewRecorder()
	(&Server{StaticDir: dir}).Handler().ServeHTTP(r, httptest.NewRequest("GET", "/fit-232-s2+ivt-233?d=2026-10-18&v=free&source=ignored", nil))
	if r.Code != 200 || !strings.Contains(r.Body.String(), `content="https://campus.kreoniz.ru/fit-232-s2+ivt-233?d=2026-10-18&amp;v=free"`) || strings.Contains(r.Body.String(), "source=ignored") {
		t.Fatalf("wrong metadata: %d %s", r.Code, r.Body.String())
	}
}
