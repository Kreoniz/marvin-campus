package httpapi

import (
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"marvin-campus/internal/schedule"
	"marvin-campus/internal/vuc"
)

func TestVucDisabledIsUnavailableNotEmpty(t *testing.T) {
	server := (&Server{Location: time.UTC}).Handler()
	for _, path := range []string{"/api/vuc?term=101", "/api/vuc/daaaaaaaaaaaa-p101?week=2026-10-26"} {
		r := httptest.NewRecorder()
		server.ServeHTTP(r, httptest.NewRequest("GET", path, nil))
		if r.Code != 503 || strings.Contains(r.Body.String(), `"data"`) {
			t.Fatalf("disabled source looked empty: %d %s", r.Code, r.Body.String())
		}
	}
}

func TestVucRoutesRetainProvenanceCoverageAndValidateInputs(t *testing.T) {
	day := schedule.Monday(time.Now().UTC()).Format("2006-01-02")
	data := vuc.Dataset{Version: 1, ImportedAt: time.Now().UTC().Format(time.RFC3339), Schedules: []vuc.Entry{{Ref: vuc.Ref{Kind: "vuc", ID: "daaaaaaaaaaaa-p101", Label: "ВУЦ · взвод 101", Description: "Тестовый документ", FirstDate: day, LastDate: day}, DocumentSHA256: strings.Repeat("a", 64), SourceLabel: "Тестовый документ", SourcePeriod: day, CoveredDates: []string{day}, UnresolvedDates: []string{}, Lessons: []vuc.Lesson{}, Warnings: []string{}, UnparsedCells: []vuc.UnparsedCell{}}}}
	body, _ := json.Marshal(data)
	store, err := vuc.Parse(body)
	if err != nil {
		t.Fatal(err)
	}
	server := (&Server{VUC: store, Location: time.UTC}).Handler()
	r := httptest.NewRecorder()
	server.ServeHTTP(r, httptest.NewRequest("GET", "/api/vuc/daaaaaaaaaaaa-p101?week="+day, nil))
	if r.Code != 200 || r.Header().Get("Cache-Control") != "no-store" || !strings.Contains(r.Body.String(), `"stale":true`) || !strings.Contains(r.Body.String(), `"importedAt"`) || !strings.Contains(r.Body.String(), `"coveredDates":["`+day+`"]`) {
		t.Fatalf("bad local document response: %d %s", r.Code, r.Body.String())
	}
	for _, path := range []string{"/api/vuc/bad?week=" + day, "/api/vuc/daaaaaaaaaaaa-p102?week=" + day, "/api/vuc/daaaaaaaaaaaa-p101?week=2026-10-27", "/api/vuc?term=" + strings.Repeat("x", 81)} {
		r = httptest.NewRecorder()
		server.ServeHTTP(r, httptest.NewRequest("GET", path, nil))
		if r.Code < 400 {
			t.Fatalf("accepted invalid or missing source: %s", path)
		}
	}
}
