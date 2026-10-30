package httpapi

import (
	"errors"
	"net/http"
	"net/url"
	"strconv"

	"marvin-campus/internal/overload"
	"marvin-campus/internal/timetable"
)

// Versioned, explicit traffic semantics. Cache mode cannot fall through to the
// old loading routes. Neither mode can access private attendance data.
func (s *Server) timetable(w http.ResponseWriter, r *http.Request) {
	query, err := url.ParseQuery(r.URL.RawQuery)
	allowed := "week"
	if r.PathValue("id") == "" {
		allowed = "term"
	}
	for name, values := range query {
		if len(values) != 1 || (name != "mode" && name != allowed) {
			err = timetable.ErrInvalid
		}
	}
	mode := query.Get("mode")
	if mode == "" {
		mode = "cache"
	}
	if err != nil || (mode != "cache" && mode != "load") {
		fail(w, 400, "Некорректный запрос расписания.")
		return
	}
	service := timetable.Service{Cache: s.Cache, Source: s.Source, Location: s.Location}
	var result timetable.Result
	if allowed == "term" {
		result, err = service.Groups(r.Context(), query.Get("term"), mode)
	} else {
		id, e := strconv.Atoi(r.PathValue("id"))
		if e != nil || strconv.Itoa(id) != r.PathValue("id") {
			fail(w, 400, "Некорректная группа.")
			return
		}
		result, err = service.Week(r.Context(), id, query.Get("week"), mode)
	}
	if err != nil {
		if errors.Is(err, timetable.ErrInvalid) {
			fail(w, 400, "Некорректный запрос расписания.")
		} else if errors.Is(err, overload.ErrBusy) {
			w.Header().Set("Retry-After", strconv.Itoa(overload.RetryAfterSeconds))
			fail(w, 503, "Очередь расписания занята.")
		} else {
			fail(w, 502, "Расписание недоступно.")
		}
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, result)
}
