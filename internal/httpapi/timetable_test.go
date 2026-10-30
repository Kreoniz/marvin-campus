package httpapi

import (
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"marvin-campus/internal/cache"
)

func TestVersionedTimetableIsStrictAndCacheOnlyByDefault(t *testing.T) {
	c, err := cache.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	c.Now = func() time.Time { return time.Date(2026, 10, 28, 0, 0, 0, 0, time.UTC) }
	s := &Server{Cache: c, Location: time.FixedZone("Omsk", 21600)}
	for _, test := range []struct {
		path   string
		status int
	}{
		{"/api/v1/timetable/weeks/1?week=2026-10-26", 200},
		{"/api/v1/timetable/groups?term=synthetic", 200},
		{"/api/v1/timetable/weeks/1?week=2026-10-26&mode=auto", 400},
		{"/api/v1/timetable/weeks/1?week=2026-10-26&mode=load&mode=cache", 400},
		{"/api/v1/timetable/weeks/1?week=2026-10-26&cache_only=true", 400},
		{"/api/v1/timetable/weeks/01?week=2026-10-26", 400},
		{"/api/v1/timetable/weeks/1?week=2026-10-27", 400},
	} {
		w := httptest.NewRecorder()
		s.Handler().ServeHTTP(w, httptest.NewRequest("GET", test.path, nil))
		if w.Code != test.status {
			t.Fatal(test.path, w.Code, w.Body.String())
		}
		if w.Code == 200 && (!strings.Contains(w.Body.String(), `"state":"NOT_CACHED"`) || strings.Contains(w.Body.String(), `"data":`)) {
			t.Fatal("missing cache reported as empty schedule")
		}
	}
}
