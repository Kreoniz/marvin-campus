package share

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/url"
	"regexp"

	_ "modernc.org/sqlite"
)

var ErrNotFound = errors.New("shared comparison not found")
var idPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{12}$`)

type Group struct {
	ID       int    `json:"id"`
	Label    string `json:"label"`
	Subgroup *int   `json:"subgroup,omitempty"`
}
type View struct {
	Groups []Group `json:"groups"`
	Week   string  `json:"week"`
	Day    string  `json:"day"`
	Mode   string  `json:"mode"`
}

type Store struct{ db *sql.DB }

func Open(path string) (*Store, error) {
	dsn := "file:" + (&url.URL{Path: path}).EscapedPath()
	if path == ":memory:" {
		dsn = ":memory:"
	}
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1)
	_, err = db.Exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS shared_views (id TEXT PRIMARY KEY, payload BLOB UNIQUE NOT NULL, created INTEGER NOT NULL);`)
	if err != nil {
		db.Close()
		return nil, err
	}
	return &Store{db: db}, nil
}
func (s *Store) Close() error { return s.db.Close() }

func (s *Store) Get(ctx context.Context, id string) (View, error) {
	var view View
	if !idPattern.MatchString(id) {
		return view, ErrNotFound
	}
	var payload []byte
	err := s.db.QueryRowContext(ctx, "SELECT payload FROM shared_views WHERE id=?", id).Scan(&payload)
	if errors.Is(err, sql.ErrNoRows) {
		return view, ErrNotFound
	}
	if err != nil {
		return view, err
	}
	return view, json.Unmarshal(payload, &view)
}
