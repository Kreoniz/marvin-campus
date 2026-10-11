package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"marvin-campus/internal/schedule"
	"marvin-campus/internal/share"
)

func TestShareAPI(t *testing.T) {
	path := filepath.Join(t.TempDir(), "legacy.sqlite")
	store, err := share.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	loc, _ := time.LoadLocation("Asia/Omsk")
	s := (&Server{Shares: store, Location: loc}).Handler()
	date := schedule.Monday(time.Now().In(loc)).Format("2006-01-02")
	payload := `{"groups":[{"id":370,"label":"ИВТ-233","subgroup":591},{"id":694,"label":"ФИТ-232"}],"week":"` + date + `","day":"` + date + `","mode":"free"}`
	var saved share.View
	if err := json.Unmarshal([]byte(payload), &saved); err != nil {
		t.Fatal(err)
	}
	id := "AbCd1234_-56"
	fixture, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatal(err)
	}
	_, err = fixture.Exec("INSERT INTO shared_views VALUES(?,?,0)", id, []byte(payload))
	fixture.Close()
	if err != nil {
		t.Fatal(err)
	}
	blocked := httptest.NewRecorder()
	s.ServeHTTP(blocked, httptest.NewRequest("POST", "/api/share", strings.NewReader(payload)))
	if blocked.Code != 410 || blocked.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("creation remains public: %d", blocked.Code)
	}
	got := httptest.NewRecorder()
	s.ServeHTTP(got, httptest.NewRequest("GET", "/api/share/"+id, nil))
	if got.Code != 200 {
		t.Fatal(got.Code)
	}
	var view share.View
	json.Unmarshal(got.Body.Bytes(), &view)
	if len(view.Groups) != 2 || *view.Groups[0].Subgroup != 591 || view.Mode != "free" {
		t.Fatal(view)
	}
	unknown := httptest.NewRecorder()
	s.ServeHTTP(unknown, httptest.NewRequest("GET", "/api/share/aaaaaaaaaaaa", nil))
	if unknown.Code != 404 {
		t.Fatal(unknown.Code)
	}
	store.Close()
	unavailable := httptest.NewRecorder()
	s.ServeHTTP(unavailable, httptest.NewRequest("GET", "/api/share/"+id, nil))
	if unavailable.Code != 503 {
		t.Fatalf("unavailable store: %d", unavailable.Code)
	}
}
