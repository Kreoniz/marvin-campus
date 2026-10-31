package httpapi

import (
	"context"
	"fmt"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"marvin-campus/internal/cache"
	"marvin-campus/internal/schedule"
)

func TestResourceRoutesValidateKindIDAndWeek(t *testing.T) {
	server := (&Server{Location: time.FixedZone("Omsk", 21600)}).Handler()
	for _, path := range []string{"/api/resources/student?term=xx", "/api/resources/lecturer?term=x", "/api/resources/auditorium/01?week=2026-10-26", "/api/resources/lecturer/0?week=2026-10-26", "/api/resources/lecturer/7?week=2026-10-27", "/api/resources/../7?week=2026-10-26"} {
		r := httptest.NewRecorder()
		server.ServeHTTP(r, httptest.NewRequest("GET", path, nil))
		if r.Code < 300 {
			t.Fatalf("accepted invalid path %s: %d", path, r.Code)
		}
	}
}

func TestResourceCachesSeparateKindsAndGroupIDs(t *testing.T) {
	c, err := cache.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	loc := time.FixedZone("Omsk", 21600)
	now := time.Now().In(loc)
	week := schedule.Monday(now).Format("2006-01-02")
	for _, kind := range []string{"lecturer", "auditorium"} {
		_, err := c.Get(context.Background(), "v1:resource-week:"+kind+":7:"+week, time.Hour, func(context.Context) ([]byte, error) {
			return []byte(fmt.Sprintf(`{"kind":%q,"id":7,"lessons":[]}`, kind)), nil
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	_, err = c.Get(context.Background(), "v1:week:7:"+week, time.Hour, func(context.Context) ([]byte, error) { return []byte(`{"groupId":7,"lessons":[],"subgroups":[]}`), nil })
	if err != nil {
		t.Fatal(err)
	}
	server := (&Server{Cache: c, Location: loc}).Handler()
	for _, kind := range []string{"lecturer", "auditorium"} {
		r := httptest.NewRecorder()
		server.ServeHTTP(r, httptest.NewRequest("GET", "/api/resources/"+kind+"/7?week="+week, nil))
		if r.Code != 200 || !strings.Contains(r.Body.String(), `"kind":"`+kind+`"`) || strings.Contains(r.Body.String(), "groupId") {
			t.Fatalf("wrong kind cache: %d %s", r.Code, r.Body.String())
		}
	}
	r := httptest.NewRecorder()
	server.ServeHTTP(r, httptest.NewRequest("GET", "/api/schedule/7?week="+week, nil))
	if r.Code != 200 || !strings.Contains(r.Body.String(), "groupId") {
		t.Fatalf("changed group contract: %d %s", r.Code, r.Body.String())
	}
}
