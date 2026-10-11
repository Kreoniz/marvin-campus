package cache

import (
	"context"
	"errors"
	"fmt"
	"marvin-campus/internal/overload"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestPersistenceFreshnessAndStaleCutoff(t *testing.T) {
	path := filepath.Join(t.TempDir(), "cache.sqlite")
	c, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 10, 12, 8, 0, 0, 0, time.UTC)
	c.Now = func() time.Time { return now }
	load := func(context.Context) ([]byte, error) { return []byte(`[]`), nil }
	first, err := c.Get(context.Background(), "key", 10*time.Minute, load)
	if err != nil {
		t.Fatal(err)
	}
	c.Close()
	c, err = Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	c.Now = func() time.Time { return now }
	failing := func(context.Context) ([]byte, error) { return nil, errors.New("down") }
	fresh, err := c.Get(context.Background(), "key", 10*time.Minute, failing)
	if err != nil || fresh.Stale || !fresh.CheckedAt.Equal(first.CheckedAt) {
		t.Fatalf("persistence: %+v %v", fresh, err)
	}
	now = now.Add(11 * time.Minute)
	stale, err := c.Get(context.Background(), "key", 10*time.Minute, failing)
	if err != nil || !stale.Stale || string(stale.Data) != `[]` {
		t.Fatalf("stale fallback: %+v %v", stale, err)
	}
	now = now.Add(24 * time.Hour)
	if _, err = c.Get(context.Background(), "key", 10*time.Minute, failing); err == nil {
		t.Fatal("served a snapshot past stale cutoff")
	}
}

func TestAdmissionBoundsDistinctKeysAndPreservesFreshAndStaleData(t *testing.T) {
	c, err := Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	c.MaxFlights = 2
	load := func(context.Context) ([]byte, error) { return []byte(`[]`), nil }
	if _, err := c.Get(context.Background(), "fresh", time.Hour, load); err != nil {
		t.Fatal(err)
	}
	if _, err := c.Get(context.Background(), "old", -time.Minute, load); err != nil {
		t.Fatal(err)
	}
	started, release := make(chan struct{}, 2), make(chan struct{})
	var calls atomic.Int32
	blocked := func(context.Context) ([]byte, error) {
		calls.Add(1)
		started <- struct{}{}
		<-release
		return []byte(`[]`), nil
	}
	for _, key := range []string{"a", "b"} {
		ctx, cancel := context.WithCancel(context.Background())
		returned := make(chan error, 1)
		go func() { _, err := c.Get(ctx, key, time.Hour, blocked); returned <- err }()
		<-started
		cancel()
		if !errors.Is(<-returned, context.Canceled) {
			t.Fatal("cancellation failed")
		}
	}
	for i := range 100 {
		if _, err := c.Get(context.Background(), fmt.Sprintf("unique-%d", i), time.Hour, blocked); !errors.Is(err, overload.ErrBusy) {
			t.Fatal(err)
		}
	}
	if _, err := c.Get(context.Background(), "fresh", time.Hour, blocked); err != nil {
		t.Fatal(err)
	}
	old, err := c.Get(context.Background(), "old", time.Minute, blocked)
	if err != nil || !old.Stale || !strings.Contains(old.Warning, "очередь") {
		t.Fatalf("stale: %+v %v", old, err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()
	if _, err := c.Get(ctx, "a", time.Hour, blocked); !errors.Is(err, context.DeadlineExceeded) {
		t.Fatalf("same-key join rejected: %v", err)
	}
	if calls.Load() != 2 {
		t.Fatalf("unbounded loads: %d", calls.Load())
	}
	close(release)
	for _, key := range []string{"a", "b"} {
		if _, err := c.Get(context.Background(), key, time.Hour, load); err != nil {
			t.Fatal(err)
		}
	}
}

func TestBusyRefreshIsAnErrorAndDoesNotPoisonFailureCooldown(t *testing.T) {
	c, err := Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	if _, err := c.Get(context.Background(), "key", time.Hour, func(context.Context) ([]byte, error) { return nil, overload.ErrBusy }); !errors.Is(err, overload.ErrBusy) {
		t.Fatal(err)
	}
	if _, err := c.Get(context.Background(), "key", time.Hour, func(context.Context) ([]byte, error) { return []byte(`[]`), nil }); err != nil {
		t.Fatalf("busy cached as source failure: %v", err)
	}
}

func TestSingleFlightAndCancelledWaiter(t *testing.T) {
	c, err := Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	var calls atomic.Int32
	started, release := make(chan struct{}), make(chan struct{})
	load := func(context.Context) ([]byte, error) {
		if calls.Add(1) == 1 {
			close(started)
		}
		<-release
		return []byte(`[]`), nil
	}
	ctx, cancel := context.WithCancel(context.Background())
	first := make(chan error, 1)
	go func() { _, err := c.Get(ctx, "key", time.Hour, load); first <- err }()
	<-started
	cancel()
	if !errors.Is(<-first, context.Canceled) {
		t.Fatal("cancelled browser still waiting")
	}
	var wg sync.WaitGroup
	for range 10 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s, err := c.Get(context.Background(), "key", time.Hour, load)
			if err != nil || string(s.Data) != `[]` {
				t.Errorf("waiter: %v", err)
			}
		}()
	}
	close(release)
	wg.Wait()
	if calls.Load() != 1 {
		t.Fatalf("duplicate upstream requests: %d", calls.Load())
	}
}

func TestFailedRequestsAreThrottledAndTTLCanShrink(t *testing.T) {
	c, err := Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	now := time.Date(2026, 10, 12, 8, 0, 0, 0, time.UTC)
	c.Now = func() time.Time { return now }
	var calls int
	failing := func(context.Context) ([]byte, error) { calls++; return nil, errors.New("down") }
	for range 2 {
		if _, err := c.Get(context.Background(), "failed", time.Hour, failing); err == nil {
			t.Fatal("failed request appeared successful")
		}
	}
	if calls != 1 {
		t.Fatalf("failed failed request bypassed throttle: %d calls", calls)
	}
	now = now.Add(time.Minute)
	_, _ = c.Get(context.Background(), "failed", time.Hour, failing)
	if calls != 2 {
		t.Fatal("failed request not released after one minute")
	}
	load := func(context.Context) ([]byte, error) { return []byte(`[]`), nil }
	_, err = c.Get(context.Background(), "week", time.Hour, load)
	if err != nil {
		t.Fatal(err)
	}
	now = now.Add(11 * time.Minute)
	s, err := c.Get(context.Background(), "week", 10*time.Minute, failing)
	if err != nil || !s.Stale || !s.ExpiresAt.Before(now) || calls != 3 {
		t.Fatalf("old future-week TTL survived: %+v, %v, %d calls", s, err, calls)
	}
}
