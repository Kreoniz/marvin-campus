package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"html"
	"log/slog"
	"net/http"
	"net/netip"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"marvin-campus/internal/cache"
	"marvin-campus/internal/overload"
	"marvin-campus/internal/schedule"
	"marvin-campus/internal/share"
	"marvin-campus/internal/upstream"
)

type Server struct {
	Cache          *cache.Cache
	Source         *upstream.Client
	Location       *time.Location
	StaticDir      string
	UmamiID        string
	Shares         *share.Store
	TrustedProxies []netip.Prefix
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	limits := newRequestLimiter()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) { writeJSON(w, 200, map[string]string{"status": "ok"}) })
	mux.HandleFunc("GET /api/config", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, map[string]string{"umamiWebsiteId": s.UmamiID})
	})
	mux.Handle("GET /api/v1/timetable/groups", limits.wrap(http.HandlerFunc(s.timetable), s.TrustedProxies))
	mux.Handle("GET /api/v1/timetable/weeks/{id}", limits.wrap(http.HandlerFunc(s.timetable), s.TrustedProxies))
	mux.Handle("GET /api/groups", limits.wrap(http.HandlerFunc(s.groups), s.TrustedProxies))
	mux.Handle("GET /api/schedule/{id}", limits.wrap(http.HandlerFunc(s.week), s.TrustedProxies))
	mux.HandleFunc("POST /api/share", func(w http.ResponseWriter, r *http.Request) {
		fail(w, http.StatusGone, "Создание коротких ссылок отключено. Используйте читаемую ссылку на сравнение.")
	})
	mux.HandleFunc("GET /api/share/{id}", s.readShare)
	mux.HandleFunc("GET /api/", func(w http.ResponseWriter, r *http.Request) { fail(w, 404, "Такого API-метода нет.") })
	mux.HandleFunc("GET /", s.static)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' https://stats.kreoniz.ru; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://stats.kreoniz.ru; frame-ancestors 'none'; base-uri 'self'")
		mux.ServeHTTP(w, r)
	})
}

func (s *Server) groups(w http.ResponseWriter, r *http.Request) {
	term := strings.TrimSpace(r.URL.Query().Get("term"))
	if utf8.RuneCountInString(term) < 2 || utf8.RuneCountInString(term) > 80 {
		fail(w, 400, "Введите от 2 до 80 символов.")
		return
	}
	key := "v1:search:" + strings.ToUpper(term)
	snapshot, err := s.Cache.Get(r.Context(), key, 24*time.Hour, func(ctx context.Context) ([]byte, error) {
		data, err := s.Source.Fetch(ctx, "/api/search?"+url.Values{"term": {term}, "type": {"group"}}.Encode())
		if err != nil {
			return nil, err
		}
		return schedule.NormalizeGroups(data)
	})
	s.respond(w, snapshot, err)
}

func (s *Server) week(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 || id > 10000000 {
		fail(w, 400, "Некорректная группа.")
		return
	}
	start, err := time.ParseInLocation("2006-01-02", r.URL.Query().Get("week"), s.Location)
	if err != nil || !start.Equal(schedule.Monday(start)) {
		fail(w, 400, "Неделя должна начинаться с понедельника: YYYY-MM-DD.")
		return
	}
	now := time.Now().In(s.Location)
	if start.Before(schedule.Monday(now).AddDate(-2, 0, 0)) || start.After(schedule.Monday(now).AddDate(2, 0, 0)) {
		fail(w, 400, "Выберите неделю в пределах двух лет от сегодняшней даты.")
		return
	}
	key := "v1:week:" + strconv.Itoa(id) + ":" + start.Format("2006-01-02")
	snapshot, err := s.Cache.Get(r.Context(), key, schedule.TTL(start, now), func(ctx context.Context) ([]byte, error) {
		query := url.Values{"start": {start.Format("2006.01.02")}, "finish": {start.AddDate(0, 0, 6).Format("2006.01.02")}, "lng": {"1"}}
		data, err := s.Source.Fetch(ctx, "/api/schedule/group/"+strconv.Itoa(id)+"?"+query.Encode())
		if err != nil {
			return nil, err
		}
		return schedule.NormalizeWeek(data, id, start)
	})
	s.respond(w, snapshot, err)
}

func (s *Server) respond(w http.ResponseWriter, snapshot cache.Snapshot, err error) {
	if err != nil {
		if errors.Is(err, overload.ErrBusy) {
			w.Header().Set("Retry-After", strconv.Itoa(overload.RetryAfterSeconds))
			fail(w, http.StatusServiceUnavailable, "Очередь обновления занята. Попробуйте через несколько секунд.")
			return
		}
		slog.Warn("request failed", "error", err)
		fail(w, 502, "Не удалось получить расписание. Попробуйте обновить позже.")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, snapshot)
}

func (s *Server) static(w http.ResponseWriter, r *http.Request) {
	path := filepath.Join(s.StaticDir, filepath.Clean("/"+r.URL.Path))
	info, err := os.Stat(path)
	if err != nil || info.IsDir() {
		if filepath.Ext(r.URL.Path) != "" {
			http.NotFound(w, r)
			return
		}
		path = filepath.Join(s.StaticDir, "index.html")
	}
	if strings.HasPrefix(r.URL.Path, "/assets/") && !strings.HasSuffix(r.URL.Path, ".webp") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	} else {
		w.Header().Set("Cache-Control", "no-cache")
	}
	if strings.HasSuffix(r.URL.Path, ".webmanifest") {
		w.Header().Set("Content-Type", "application/manifest+json; charset=utf-8")
	}
	if path == filepath.Join(s.StaticDir, "index.html") && r.URL.Path != "/" {
		body, err := os.ReadFile(path)
		if err != nil {
			http.NotFound(w, r)
			return
		}
		query := url.Values{}
		if !strings.HasPrefix(r.URL.Path, "/s/") {
			for _, key := range []string{"d", "v"} {
				if value := r.URL.Query().Get(key); value != "" {
					query.Set(key, value)
				}
			}
		}
		pageURL := (&url.URL{Scheme: "https", Host: "campus.kreoniz.ru", Path: r.URL.Path, RawQuery: query.Encode()}).String()
		body = bytes.ReplaceAll(body,
			[]byte(`<meta property="og:url" content="https://campus.kreoniz.ru/" />`),
			[]byte(`<meta property="og:url" content="`+html.EscapeString(pageURL)+`" />`))
		http.ServeContent(w, r, "index.html", time.Time{}, bytes.NewReader(body))
		return
	}
	http.ServeFile(w, r, path)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
func fail(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, status, map[string]string{"error": message})
}
