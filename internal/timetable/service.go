// Package timetable exposes public planned schedules; it owns no attendance,
// student identities, journal bindings or authority to change journal marks.
package timetable

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"marvin-campus/internal/cache"
	"marvin-campus/internal/schedule"
	"marvin-campus/internal/upstream"
)

var ErrInvalid = errors.New("invalid_timetable_request")

type Service struct {
	Cache    *cache.Cache
	Source   *upstream.Client
	Location *time.Location
}
type Result struct {
	State       string          `json:"state"`
	Source      string          `json:"source"`
	Mode        string          `json:"mode"`
	SnapshotRef string          `json:"snapshot_ref,omitempty"`
	CheckedAt   time.Time       `json:"checked_at,omitzero"`
	ExpiresAt   time.Time       `json:"expires_at,omitzero"`
	Stale       bool            `json:"stale"`
	Warning     string          `json:"warning,omitempty"`
	Data        json.RawMessage `json:"data,omitempty"`
	Membership  string          `json:"membership"`
}

func (s Service) read(ctx context.Context, key, mode string, ttl time.Duration, load func(context.Context) ([]byte, error)) (Result, error) {
	result := Result{State: "NOT_CACHED", Source: "RUZ_PLANNED", Mode: mode, Membership: "DISPLAY_ONLY"}
	if s.Cache == nil || (mode != "cache" && mode != "load") {
		return result, ErrInvalid
	}
	var snapshot cache.Snapshot
	var err error
	if mode == "cache" {
		var found bool
		snapshot, found, err = s.Cache.Peek(ctx, key, ttl)
		if err != nil || !found {
			return result, err
		}
	} else {
		if s.Source == nil {
			return result, ErrInvalid
		}
		snapshot, err = s.Cache.Get(ctx, key, ttl, load)
		if err != nil {
			return result, err
		}
	}
	result.State = "READY"
	result.CheckedAt, result.ExpiresAt, result.Stale, result.Warning, result.Data = snapshot.CheckedAt, snapshot.ExpiresAt, snapshot.Stale, snapshot.Warning, snapshot.Data
	raw, _ := json.Marshal(struct {
		Key     string
		Checked time.Time
		Data    json.RawMessage
	}{key, snapshot.CheckedAt, snapshot.Data})
	h := sha256.Sum256(raw)
	result.SnapshotRef = hex.EncodeToString(h[:])
	return result, nil
}

func (s Service) Groups(ctx context.Context, term, mode string) (Result, error) {
	if strings.TrimSpace(term) != term || utf8.RuneCountInString(term) < 2 || utf8.RuneCountInString(term) > 80 {
		return Result{}, ErrInvalid
	}
	key := "v1:search:" + strings.ToUpper(term)
	return s.read(ctx, key, mode, 24*time.Hour, func(ctx context.Context) ([]byte, error) {
		data, err := s.Source.Fetch(ctx, "/api/search?"+url.Values{"term": {term}, "type": {"group"}}.Encode())
		if err != nil {
			return nil, err
		}
		return schedule.NormalizeGroups(data)
	})
}

func (s Service) Week(ctx context.Context, id int, week, mode string) (Result, error) {
	if s.Cache == nil || s.Location == nil || id < 1 || id > 10000000 {
		return Result{}, ErrInvalid
	}
	start, err := time.ParseInLocation(time.DateOnly, week, s.Location)
	if err != nil || !start.Equal(schedule.Monday(start)) {
		return Result{}, ErrInvalid
	}
	now := s.Cache.Now().In(s.Location)
	if start.Before(schedule.Monday(now).AddDate(-2, 0, 0)) || start.After(schedule.Monday(now).AddDate(2, 0, 0)) {
		return Result{}, ErrInvalid
	}
	key := "v1:week:" + strconv.Itoa(id) + ":" + week
	return s.read(ctx, key, mode, schedule.TTL(start, now), func(ctx context.Context) ([]byte, error) {
		query := url.Values{"start": {start.Format("2006.01.02")}, "finish": {start.AddDate(0, 0, 6).Format("2006.01.02")}, "lng": {"1"}}
		data, err := s.Source.Fetch(ctx, "/api/schedule/group/"+strconv.Itoa(id)+"?"+query.Encode())
		if err != nil {
			return nil, err
		}
		return schedule.NormalizeWeek(data, id, start)
	})
}
