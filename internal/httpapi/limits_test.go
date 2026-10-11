package httpapi

import (
	"fmt"
	"marvin-campus/internal/cache"
	"marvin-campus/internal/overload"
	"net/http"
	"net/http/httptest"
	"net/netip"
	"strings"
	"testing"
	"time"
)

func TestRateLimitBurstRefillIsolationAndRetryHeader(t *testing.T) {
	limiter := newRequestLimiter()
	now := time.Now()
	limiter.now = func() time.Time { return now }
	handler := limiter.wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(200) }), nil)
	request := func(ip string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", "/api/groups?term=ФИТ", nil)
		r.RemoteAddr = ip + ":1234"
		w := httptest.NewRecorder()
		handler.ServeHTTP(w, r)
		return w
	}
	for range requestBurst {
		if w := request("192.0.2.1"); w.Code != 200 {
			t.Fatal(w.Code)
		}
	}
	if w := request("192.0.2.1"); w.Code != 429 || w.Header().Get("Retry-After") == "" {
		t.Fatalf("limit: %d", w.Code)
	}
	if w := request("192.0.2.2"); w.Code != 200 {
		t.Fatal("other client blocked")
	}
	now = now.Add(time.Second)
	if w := request("192.0.2.1"); w.Code != 200 {
		t.Fatal("bucket did not refill")
	}
}

func TestForwardedAddressesRequireTrustedProxyAndIgnoreForgedPrefix(t *testing.T) {
	trusted := []netip.Prefix{netip.MustParsePrefix("192.0.2.10/32")}
	for _, tc := range []struct{ peer, chain, want string }{
		{"192.0.2.11:5000", "198.51.100.1", "192.0.2.11"},
		{"192.0.2.10:5000", "203.0.113.99, 198.51.100.1", "198.51.100.1"},
		{"192.0.2.10:5000", "198.51.100.1, 192.0.2.10", "198.51.100.1"},
		{"192.0.2.10:5000", "invalid", "192.0.2.10"},
		{"[::ffff:192.0.2.10]:5000", "198.51.100.1", "198.51.100.1"},
	} {
		r := httptest.NewRequest("GET", "/", nil)
		r.RemoteAddr = tc.peer
		r.Header.Set("X-Forwarded-For", tc.chain)
		if got := clientIP(r, trusted).String(); got != tc.want {
			t.Errorf("%+v: %s", tc, got)
		}
	}
}

func TestClientTrackingIsBoundedAndExpires(t *testing.T) {
	l := newRequestLimiter()
	now := time.Now()
	l.now = func() time.Time { return now }
	for i := range maxClients {
		l.allow(netip.AddrFrom4([4]byte{10, byte(i >> 8), byte(i), 1}))
	}
	if allowed, _ := l.allow(netip.MustParseAddr("203.0.113.5")); allowed {
		t.Fatal("unbounded client map")
	}
	now = now.Add(6 * time.Minute)
	if allowed, _ := l.allow(netip.MustParseAddr("203.0.113.5")); !allowed || len(l.clients) != 1 {
		t.Fatal("expired clients retained")
	}
}

func TestBusyResponseAndScriptPolicy(t *testing.T) {
	w := httptest.NewRecorder()
	(&Server{}).respond(w, cache.Snapshot{}, fmt.Errorf("wrapped: %w", overload.ErrBusy))
	if w.Code != 503 || w.Header().Get("Retry-After") != "5" {
		t.Fatalf("busy: %d", w.Code)
	}
	w = httptest.NewRecorder()
	(&Server{}).Handler().ServeHTTP(w, httptest.NewRequest("GET", "/api/health", nil))
	for _, directive := range strings.Split(w.Header().Get("Content-Security-Policy"), ";") {
		if strings.HasPrefix(strings.TrimSpace(directive), "script-src") && strings.Contains(directive, "unsafe-inline") {
			t.Fatal("inline scripts remain allowed")
		}
	}
}
