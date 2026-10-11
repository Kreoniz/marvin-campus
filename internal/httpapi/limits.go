package httpapi

import (
	"math"
	"net"
	"net/http"
	"net/netip"
	"strconv"
	"strings"
	"sync"
	"time"
)

// A generous burst permits a full comparison behind a shared NAT. The cache
// admission limit separately bounds expensive work on misses.
const requestBurst = 120
const requestsPerSecond = 2
const maxClients = 4096

type requestBucket struct {
	tokens float64
	at     time.Time
}
type requestLimiter struct {
	mu      sync.Mutex
	clients map[netip.Addr]requestBucket
	pruned  time.Time
	now     func() time.Time
}

func newRequestLimiter() *requestLimiter {
	return &requestLimiter{clients: make(map[netip.Addr]requestBucket), now: time.Now}
}
func (l *requestLimiter) allow(ip netip.Addr) (bool, int) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	if now.Sub(l.pruned) >= time.Minute {
		for key, bucket := range l.clients {
			if now.Sub(bucket.at) >= 5*time.Minute {
				delete(l.clients, key)
			}
		}
		l.pruned = now
	}
	bucket, exists := l.clients[ip]
	if !exists {
		if len(l.clients) >= maxClients {
			return false, 60
		}
		bucket = requestBucket{tokens: requestBurst, at: now}
	}
	bucket.tokens = math.Min(requestBurst, bucket.tokens+now.Sub(bucket.at).Seconds()*requestsPerSecond)
	bucket.at = now
	allowed := bucket.tokens >= 1
	if allowed {
		bucket.tokens--
	}
	l.clients[ip] = bucket
	return allowed, max(1, int(math.Ceil((1-bucket.tokens)/requestsPerSecond)))
}
func (l *requestLimiter) wrap(next http.Handler, trusted []netip.Prefix) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		allowed, retry := l.allow(clientIP(r, trusted))
		if !allowed {
			w.Header().Set("Retry-After", strconv.Itoa(retry))
			fail(w, http.StatusTooManyRequests, "Слишком много запросов. Подождите несколько секунд.")
			return
		}
		next.ServeHTTP(w, r)
	})
}
func clientIP(r *http.Request, trusted []netip.Prefix) netip.Addr {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	peer, _ := netip.ParseAddr(host)
	peer = peer.Unmap()
	isTrusted := func(ip netip.Addr) bool {
		for _, prefix := range trusted {
			if prefix.Contains(ip) {
				return true
			}
		}
		return false
	}
	if !isTrusted(peer) {
		return peer
	}
	// Walk from the proxy toward the client; never trust a client-supplied prefix.
	chain := strings.Split(r.Header.Get("X-Forwarded-For"), ",")
	if len(chain) > 16 {
		return peer
	}
	for i := len(chain) - 1; i >= 0; i-- {
		ip, err := netip.ParseAddr(strings.TrimSpace(chain[i]))
		if err != nil {
			return peer
		}
		ip = ip.Unmap()
		if !isTrusted(ip) {
			return ip
		}
	}
	return peer
}
