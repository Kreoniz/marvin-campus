package cache

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"marvin-campus/internal/overload"

	_ "modernc.org/sqlite"
)

type Snapshot struct {
	Data      json.RawMessage `json:"data"`
	CheckedAt time.Time       `json:"checkedAt"`
	ExpiresAt time.Time       `json:"expiresAt"`
	Stale     bool            `json:"stale"`
	Warning   string          `json:"warning,omitempty"`
}

type flight struct {
	done   chan struct{}
	result Snapshot
	err    error
}

type failedLoad struct {
	at  time.Time
	err error
}

type Cache struct {
	db       *sql.DB
	mu       sync.Mutex
	flights  map[string]*flight
	failures map[string]failedLoad
	Now      func() time.Time
	// MaxFlights bounds new refreshes, not callers joining an existing key.
	MaxFlights int
}

func Open(path string) (*Cache, error) {
	if path != ":memory:" {
		if err := os.MkdirAll(filepath.Dir(path), 0750); err != nil {
			return nil, err
		}
	}
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	_, err = db.Exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
	 CREATE TABLE IF NOT EXISTS snapshots (key TEXT PRIMARY KEY, payload BLOB NOT NULL, checked INTEGER NOT NULL, expires INTEGER NOT NULL, touched INTEGER NOT NULL);`)
	if err != nil {
		db.Close()
		return nil, err
	}
	return &Cache{db: db, flights: map[string]*flight{}, failures: map[string]failedLoad{}, Now: time.Now, MaxFlights: 32}, nil
}

func (c *Cache) Close() error { return c.db.Close() }

// Get keeps a last successful snapshot on disk. Failure is never written as an
// empty schedule. A refresh continues even if the initiating browser goes away.
func (c *Cache) Get(ctx context.Context, key string, ttl time.Duration, load func(context.Context) ([]byte, error)) (Snapshot, error) {
	c.mu.Lock()
	now := c.Now()
	stored, found, err := c.read(key)
	if err != nil {
		c.mu.Unlock()
		return Snapshot{}, err
	}
	// A future week becoming the current week must adopt the shorter TTL.
	if found && stored.CheckedAt.Add(ttl).Before(stored.ExpiresAt) {
		stored.ExpiresAt = stored.CheckedAt.Add(ttl)
	}
	if found && now.Before(stored.ExpiresAt) {
		c.mu.Unlock()
		return stored, nil
	}
	f, exists := c.flights[key]
	if !exists {
		if failure, ok := c.failures[key]; ok && now.Sub(failure.at) < time.Minute {
			c.mu.Unlock()
			if found && !now.After(stored.ExpiresAt.Add(24*time.Hour)) {
				stored.Stale = true
				stored.Warning = failureWarning(failure.err)
				return stored, nil
			}
			return Snapshot{}, failure.err
		}
		if len(c.flights) >= c.MaxFlights {
			c.mu.Unlock()
			if found && !now.After(stored.ExpiresAt.Add(24*time.Hour)) {
				stored.Stale = true
				stored.Warning = failureWarning(overload.ErrBusy)
				return stored, nil
			}
			return Snapshot{}, overload.ErrBusy
		}
		f = &flight{done: make(chan struct{})}
		c.flights[key] = f
		go func() {
			fetchCtx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
			defer cancel()
			data, loadErr := load(fetchCtx)
			checked := c.Now()
			if loadErr == nil {
				f.result = Snapshot{Data: data, CheckedAt: checked, ExpiresAt: checked.Add(ttl)}
				f.err = c.write(key, f.result)
			} else if found && !checked.After(stored.ExpiresAt.Add(24*time.Hour)) {
				stored.Stale = true
				stored.Warning = failureWarning(loadErr)
				f.result = stored
			} else {
				f.err = fmt.Errorf("schedule source unavailable: %w", loadErr)
			}
			c.mu.Lock()
			if loadErr == nil {
				delete(c.failures, key)
			} else if !errors.Is(loadErr, overload.ErrBusy) {
				c.failures[key] = failedLoad{at: checked, err: loadErr}
				if len(c.failures) > 5000 {
					for k, failure := range c.failures {
						if checked.Sub(failure.at) >= time.Minute {
							delete(c.failures, k)
						}
					}
					// An attacker can fail many distinct keys within one minute.
					if len(c.failures) > 5000 {
						delete(c.failures, key)
					}
				}
			}
			delete(c.flights, key)
			close(f.done)
			c.mu.Unlock()
		}()
	}
	c.mu.Unlock()
	select {
	case <-ctx.Done():
		return Snapshot{}, ctx.Err()
	case <-f.done:
		return f.result, f.err
	}
}

func failureWarning(err error) string {
	if errors.Is(err, overload.ErrBusy) {
		return "Обновление отложено: очередь занята. Показан последний сохранённый снимок."
	}
	return "Источник недоступен. Показан последний сохранённый снимок."
}

func (c *Cache) read(key string) (Snapshot, bool, error) {
	var s Snapshot
	var checked, expires, touched int64
	err := c.db.QueryRow("SELECT payload, checked, expires, touched FROM snapshots WHERE key=?", key).Scan(&s.Data, &checked, &expires, &touched)
	if errors.Is(err, sql.ErrNoRows) {
		return s, false, nil
	}
	if err != nil {
		return s, false, err
	}
	s.CheckedAt = time.Unix(checked, 0).UTC()
	s.ExpiresAt = time.Unix(expires, 0).UTC()
	// Recency is only used for 30-day/row-count eviction. Minute precision avoids
	// a SQLite write on every fresh hit without extending snapshot freshness.
	if now := c.Now().Unix(); now-touched >= 60 {
		_, err = c.db.Exec("UPDATE snapshots SET touched=? WHERE key=?", now, key)
	}
	return s, true, err
}

func (c *Cache) write(key string, s Snapshot) error {
	_, err := c.db.Exec(`INSERT INTO snapshots(key,payload,checked,expires,touched) VALUES(?,?,?,?,?)
	ON CONFLICT(key) DO UPDATE SET payload=excluded.payload, checked=excluded.checked, expires=excluded.expires, touched=excluded.touched`, key, []byte(s.Data), s.CheckedAt.Unix(), s.ExpiresAt.Unix(), s.CheckedAt.Unix())
	if err != nil {
		return err
	}
	_, err = c.db.Exec(`DELETE FROM snapshots WHERE touched < ? OR key IN
	(SELECT key FROM snapshots ORDER BY touched DESC LIMIT -1 OFFSET 5000)`, c.Now().AddDate(0, 0, -30).Unix())
	return err
}
