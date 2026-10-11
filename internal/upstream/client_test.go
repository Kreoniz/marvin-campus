package upstream

import (
	"context"
	"errors"
	"marvin-campus/internal/overload"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

func TestRetryAfterAndBadResponse(t *testing.T) {
	now := time.Now()
	if RetryAfter("120", now).Sub(now) != 2*time.Minute || !RetryAfter(now.Add(time.Minute).UTC().Format(http.TimeFormat), now).After(now) {
		t.Fatal("Retry-After not parsed")
	}
	for _, body := range []string{"<html>blocked</html>", "null", `{"error":"down"}`} {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { _, _ = w.Write([]byte(body)) }))
		client := New(server.URL)
		if _, err := client.Fetch(context.Background(), "/"); err == nil {
			t.Fatalf("accepted %s", body)
		}
		server.Close()
	}
}

func TestWaitingBehindActiveRequestIsCancellableAndQueueIsBounded(t *testing.T) {
	started, release := make(chan struct{}), make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { close(started); <-release; _, _ = w.Write([]byte(`[]`)) }))
	defer server.Close()
	client := New(server.URL)
	first := make(chan error, 1)
	go func() { _, err := client.Fetch(context.Background(), "/active"); first <- err }()
	<-started
	ctx, cancel := context.WithCancel(context.Background())
	second := make(chan error, 1)
	go func() { _, err := client.Fetch(ctx, "/queued"); second <- err }()
	cancel()
	select {
	case err := <-second:
		if !errors.Is(err, context.Canceled) {
			t.Fatal(err)
		}
	case <-time.After(time.Second):
		t.Fatal("cancelled waiter blocked on active request")
	}
	for len(client.queue) < cap(client.queue) {
		client.queue <- struct{}{}
	}
	if _, err := client.Fetch(context.Background(), "/overflow"); !errors.Is(err, overload.ErrBusy) {
		t.Fatal(err)
	}
	close(release)
	if err := <-first; err != nil {
		t.Fatal(err)
	}
}

func TestRateLimitPausesRequestsForOtherGroups(t *testing.T) {
	var calls atomic.Int32
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls.Add(1)
		w.Header().Set("Retry-After", "60")
		w.WriteHeader(http.StatusTooManyRequests)
	}))
	defer server.Close()
	client := New(server.URL)
	if _, err := client.Fetch(context.Background(), "/group/a"); err == nil {
		t.Fatal("rate limit appeared successful")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	if _, err := client.Fetch(ctx, "/group/b"); err == nil || calls.Load() != 1 {
		t.Fatalf("another group bypassed Retry-After: %v, %d requests", err, calls.Load())
	}
}

func TestGlobalSpacing(t *testing.T) {
	var previous time.Time
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !previous.IsZero() && time.Since(previous) < 20*time.Millisecond {
			t.Error("requests not spaced")
		}
		previous = time.Now()
		_, _ = w.Write([]byte(`[]`))
	}))
	defer server.Close()
	client := New(server.URL)
	client.Spacing = 25 * time.Millisecond
	for _, path := range []string{"/a", "/b"} {
		if _, err := client.Fetch(context.Background(), path); err != nil {
			t.Fatal(err)
		}
	}
}
