package timetable

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"marvin-campus/internal/cache"
	"marvin-campus/internal/upstream"
)

func TestCacheMissDoesNotCallSourceAndExplicitLoadReusesSameCache(t *testing.T) {
	c, err := cache.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	now := time.Date(2026, 10, 28, 0, 0, 0, 0, time.UTC)
	c.Now = func() time.Time { return now }
	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { calls.Add(1); w.Write([]byte(`[]`)) }))
	defer server.Close()
	s := Service{Cache: c, Source: upstream.New(server.URL), Location: time.FixedZone("Omsk", 21600)}
	ctx := context.Background()
	missing, err := s.Week(ctx, 1, "2026-10-26", "cache")
	if err != nil || missing.State != "NOT_CACHED" || missing.Data != nil || calls.Load() != 0 {
		t.Fatal("cache miss fetched or invented empty week", err)
	}
	loaded, err := s.Week(ctx, 1, "2026-10-26", "load")
	if err != nil || loaded.State != "READY" || calls.Load() != 1 || loaded.Source != "RUZ_PLANNED" {
		t.Fatal("explicit load failed", err)
	}
	peek, err := s.Week(ctx, 1, "2026-10-26", "cache")
	if err != nil || peek.SnapshotRef != loaded.SnapshotRef || calls.Load() != 1 {
		t.Fatal("cache facade refetched")
	}
	now = now.Add(2 * time.Hour)
	stale, err := s.Week(ctx, 1, "2026-10-26", "cache")
	if err != nil || !stale.Stale || stale.SnapshotRef != loaded.SnapshotRef || !stale.CheckedAt.Equal(loaded.CheckedAt) || calls.Load() != 1 {
		t.Fatal("stale cache fabricated freshness")
	}
	if _, err = s.Week(ctx, 1, "2026-10-27", "cache"); err != ErrInvalid {
		t.Fatal("non-Monday accepted")
	}
	if _, err = s.Week(ctx, 1, "2026-10-26", "auto"); err != ErrInvalid {
		t.Fatal("unknown fetch mode")
	}
	if _, err = s.Groups(ctx, "group", "cache"); err != nil || calls.Load() != 1 {
		t.Fatal("group search cache fetched")
	}
}
