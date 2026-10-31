package httpapi

import (
	"context"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"marvin-campus/internal/schedule"
)

func (s *Server) resources(w http.ResponseWriter, r *http.Request) {
	kind := r.PathValue("kind")
	term := strings.TrimSpace(r.URL.Query().Get("term"))
	if !schedule.ResourceKind(kind) || utf8.RuneCountInString(term) < 2 || utf8.RuneCountInString(term) > 80 {
		fail(w, 400, "Выберите преподавателя или аудиторию и введите от 2 до 80 символов.")
		return
	}
	key := "v1:resource-search:" + kind + ":" + strings.ToUpper(term)
	snapshot, err := s.Cache.Get(r.Context(), key, 24*time.Hour, func(ctx context.Context) ([]byte, error) {
		data, err := s.Source.Fetch(ctx, "/api/search?"+url.Values{"term": {term}, "type": {kind}}.Encode())
		if err != nil {
			return nil, err
		}
		return schedule.NormalizeResources(data, kind)
	})
	s.respond(w, snapshot, err)
}

func (s *Server) resourceWeek(w http.ResponseWriter, r *http.Request) {
	kind := r.PathValue("kind")
	id, err := strconv.Atoi(r.PathValue("id"))
	if !schedule.ResourceKind(kind) || err != nil || id <= 0 || id > 10000000 || strconv.Itoa(id) != r.PathValue("id") {
		fail(w, 400, "Некорректный преподаватель или аудитория.")
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
	key := "v1:resource-week:" + kind + ":" + strconv.Itoa(id) + ":" + start.Format("2006-01-02")
	snapshot, err := s.Cache.Get(r.Context(), key, schedule.TTL(start, now), func(ctx context.Context) ([]byte, error) {
		query := url.Values{"start": {start.Format("2006.01.02")}, "finish": {start.AddDate(0, 0, 6).Format("2006.01.02")}, "lng": {"1"}}
		data, err := s.Source.Fetch(ctx, "/api/schedule/"+kind+"/"+strconv.Itoa(id)+"?"+query.Encode())
		if err != nil {
			return nil, err
		}
		return schedule.NormalizeResourceWeek(data, kind, id, start)
	})
	s.respond(w, snapshot, err)
}
