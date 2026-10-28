package cache

import (
	"context"
	"database/sql"
	"errors"
	"time"
)

// Peek reads the last stored observation without a loader, recency updates,
// flight creation, eviction or any other write. Expired data remains explicit.
func (c *Cache) Peek(ctx context.Context, key string, ttl time.Duration) (Snapshot, bool, error) {
	var s Snapshot
	var checked, expires int64
	err := c.db.QueryRowContext(ctx, "SELECT payload,checked,expires FROM snapshots WHERE key=?", key).Scan(&s.Data, &checked, &expires)
	if errors.Is(err, sql.ErrNoRows) {
		return s, false, nil
	}
	if err != nil {
		return s, false, err
	}
	s.CheckedAt = time.Unix(checked, 0).UTC()
	s.ExpiresAt = time.Unix(expires, 0).UTC()
	if ttl > 0 && s.CheckedAt.Add(ttl).Before(s.ExpiresAt) {
		s.ExpiresAt = s.CheckedAt.Add(ttl)
	}
	s.Stale = !c.Now().Before(s.ExpiresAt)
	return s, true, nil
}
