package httpapi

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"testing/synctest"
	"time"

	"marvin-campus/internal/cache"
	"marvin-campus/internal/overload"
	"marvin-campus/internal/schedule"
	"marvin-campus/internal/upstream"
)

type capacityTransport func(*http.Request) (*http.Response, error)

func (f capacityTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// This exercises admission and HTTP outcomes, not real source latency or load.
// A fake transport holds the source while synctest waits for every API request
// to block. Its virtual clock retains production spacing without real sleeps.
func TestCapacityThirtyGroupBatchAndOtherClients(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		c, err := cache.Open(":memory:")
		if err != nil {
			t.Fatal(err)
		}
		loc, err := time.LoadLocation("Asia/Omsk")
		if err != nil {
			c.Close()
			t.Fatal(err)
		}
		if c.MaxFlights != 32 {
			c.Close()
			t.Fatalf("default refresh admission = %d, want 32", c.MaxFlights)
		}
		week := schedule.Monday(time.Now().In(loc)).Format("2006-01-02")
		const warmID = 9000
		_, err = c.Get(context.Background(), fmt.Sprintf("v1:week:%d:%s", warmID, week), time.Hour, func(context.Context) ([]byte, error) {
			return []byte(`{"groupId":9000,"lessons":[],"subgroups":[]}`), nil
		})
		if err != nil {
			c.Close()
			t.Fatal(err)
		}

		gate := make(chan struct{})
		release := sync.OnceFunc(func() { close(gate) })
		var calls atomic.Int32
		source := upstream.New("https://source.example")
		source.HTTP.Transport = capacityTransport(func(r *http.Request) (*http.Response, error) {
			calls.Add(1)
			select {
			case <-gate:
				return &http.Response{
					StatusCode: http.StatusOK,
					Header:     make(http.Header),
					Body:       io.NopCloser(strings.NewReader(`[]`)),
				}, nil
			case <-r.Context().Done():
				return nil, r.Context().Err()
			}
		})
		handler := (&Server{Cache: c, Source: source, Location: loc}).Handler()
		var pending []<-chan *httptest.ResponseRecorder
		t.Cleanup(func() {
			release()
			// Channels close after sending, so already-read responses also drain.
			for _, done := range pending {
				<-done
			}
			if err := c.Close(); err != nil {
				t.Error(err)
			}
		})
		serve := func(id int, ip string) *httptest.ResponseRecorder {
			r := httptest.NewRequest("GET", fmt.Sprintf("/api/schedule/%d?week=%s", id, week), nil)
			r.RemoteAddr = ip + ":1234"
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, r)
			return w
		}
		start := func(id int, ip string) {
			done := make(chan *httptest.ResponseRecorder, 1)
			pending = append(pending, done)
			go func() {
				defer close(done)
				done <- serve(id, ip)
			}()
		}
		assertWaiting := func() {
			t.Helper()
			synctest.Wait()
			for i, done := range pending {
				select {
				case w := <-done:
					t.Fatalf("request %d returned before source release: %d", i, w.Code)
				default:
				}
			}
			if got := calls.Load(); got != 1 {
				t.Fatalf("active source calls = %d, want one serialized call", got)
			}
		}

		// One shared-NAT client can load the supported 30-group comparison.
		for id := 100; id < 130; id++ {
			start(id, "192.0.2.1")
		}
		assertWaiting()
		// Other clients can use the remaining two global refresh slots.
		start(200, "192.0.2.2")
		start(201, "192.0.2.3")
		assertWaiting()
		// A new client has a full IP bucket but no reserved refresh capacity.
		overflow := serve(202, "192.0.2.4")
		if overflow.Code != http.StatusServiceUnavailable || overflow.Header().Get("Retry-After") != fmt.Sprint(overload.RetryAfterSeconds) {
			t.Fatalf("saturated cold request: status=%d retry=%q", overflow.Code, overflow.Header().Get("Retry-After"))
		}
		// Fresh data and existing-key joins need no additional refresh slot.
		if w := serve(warmID, "192.0.2.4"); w.Code != http.StatusOK {
			t.Fatalf("warm request under saturation: %d", w.Code)
		}
		start(100, "192.0.2.4")
		assertWaiting()

		release()
		for i, done := range pending {
			if w := <-done; w.Code != http.StatusOK {
				t.Errorf("admitted/joined request %d: status=%d body=%s", i, w.Code, w.Body.String())
			}
		}
		if got := calls.Load(); got != 32 {
			t.Fatalf("source calls after draining = %d, want 32 distinct refreshes", got)
		}
		if w := serve(202, "192.0.2.4"); w.Code != http.StatusOK {
			t.Fatalf("new refresh after capacity was released: %d", w.Code)
		}
		if got := calls.Load(); got != 33 {
			t.Fatalf("source calls after recovery = %d, want 33", got)
		}
	})
}
