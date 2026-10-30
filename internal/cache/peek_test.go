package cache

import (
	"context"
	"testing"
	"time"
)

func TestPeekNeverWritesOrLoadsAndKeepsObservationTime(t *testing.T) {
	c, err := Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	now := time.Date(2026, 10, 28, 0, 0, 0, 0, time.UTC)
	c.Now = func() time.Time { return now }
	before, err := c.Get(context.Background(), "key", time.Hour, func(context.Context) ([]byte, error) { return []byte(`[]`), nil })
	if err != nil {
		t.Fatal(err)
	}
	for _, op := range []string{"INSERT", "UPDATE", "DELETE"} {
		if _, err = c.db.Exec("CREATE TRIGGER no_" + op + " BEFORE " + op + " ON snapshots BEGIN SELECT RAISE(ABORT,'read_only'); END"); err != nil {
			t.Fatal(err)
		}
	}
	now = now.Add(72 * time.Hour)
	peek, found, err := c.Peek(context.Background(), "key", 30*time.Minute)
	if err != nil || !found || !peek.Stale || !peek.CheckedAt.Equal(before.CheckedAt) || !peek.ExpiresAt.Equal(before.CheckedAt.Add(30*time.Minute)) {
		t.Fatal("read changed observation or freshness", err)
	}
	if _, found, err = c.Peek(context.Background(), "missing", time.Hour); err != nil || found {
		t.Fatal("miss became a load")
	}
	if len(c.flights) != 0 || len(c.failures) != 0 {
		t.Fatal("peek created operational state")
	}
}
