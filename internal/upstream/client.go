package upstream

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"marvin-campus/internal/overload"
)

// One client owns the source queue. Separate browser requests never bypass its
// spacing or Retry-After cooldown, including requests for different groups.
type Client struct {
	BaseURL  string
	HTTP     *http.Client
	Spacing  time.Duration
	gate     chan struct{}
	queue    chan struct{}
	next     time.Time
	failures int
}

func New(base string) *Client {
	return &Client{BaseURL: strings.TrimRight(base, "/"), HTTP: &http.Client{Timeout: 20 * time.Second}, Spacing: 500 * time.Millisecond, gate: make(chan struct{}, 1), queue: make(chan struct{}, 32)}
}

func (c *Client) Fetch(ctx context.Context, path string) ([]byte, error) {
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	select {
	case c.queue <- struct{}{}:
		defer func() { <-c.queue }()
	default:
		return nil, overload.ErrBusy
	}
	// Waiting for a slow request must be cancellable and have its own deadline.
	wait := time.NewTimer(25 * time.Second)
	defer wait.Stop()
	select {
	case c.gate <- struct{}{}:
		defer func() { <-c.gate }()
	case <-ctx.Done():
		return nil, ctx.Err()
	case <-wait.C:
		return nil, overload.ErrBusy
	}
	if delay := time.Until(c.next); delay > 0 {
		timer := time.NewTimer(delay)
		defer timer.Stop()
		select {
		case <-timer.C:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	req, err := http.NewRequestWithContext(ctx, "GET", c.BaseURL+path, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "MarvinCampus/1.0 (+https://campus.kreoniz.ru)")
	resp, err := c.HTTP.Do(req)
	c.next = time.Now().Add(c.Spacing)
	if err != nil {
		c.backoff()
		return nil, fmt.Errorf("source request: %w", err)
	}
	defer resp.Body.Close()
	if retry := RetryAfter(resp.Header.Get("Retry-After"), time.Now()); retry.After(c.next) {
		c.next = retry
	}
	if resp.StatusCode != http.StatusOK {
		c.backoff()
		return nil, fmt.Errorf("source status %d", resp.StatusCode)
	}
	const limit = 8 << 20
	data, err := io.ReadAll(io.LimitReader(resp.Body, limit+1))
	trimmed := strings.TrimSpace(string(data))
	if err != nil || len(data) > limit || !json.Valid(data) || !strings.HasPrefix(trimmed, "[") {
		c.backoff()
		return nil, fmt.Errorf("source returned invalid JSON array")
	}
	c.failures = 0
	return data, nil
}

func (c *Client) backoff() {
	c.failures++
	delay := time.Second * time.Duration(1<<min(c.failures, 6))
	if next := time.Now().Add(delay); next.After(c.next) {
		c.next = next
	}
}

func RetryAfter(value string, now time.Time) time.Time {
	if seconds, err := strconv.Atoi(value); err == nil && seconds >= 0 {
		return now.Add(time.Duration(seconds) * time.Second)
	}
	if t, err := http.ParseTime(value); err == nil {
		return t
	}
	return time.Time{}
}
