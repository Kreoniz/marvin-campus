package httpapi

import (
	"bytes"
	"mime"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"marvin-campus/internal/schedule"
	"marvin-campus/internal/vuc"
)

func (s *Server) vucOriginal(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if !vuc.IDPattern.MatchString(id) {
		fail(w, 400, "Некорректный взвод ВУЦ.")
		return
	}
	if s.VUC == nil {
		fail(w, 503, "Документы ВУЦ ещё не импортированы на этом сервере.")
		return
	}
	original, ok := s.VUC.Original(id)
	if !ok {
		fail(w, 404, "Оригинал документа ВУЦ недоступен на этом сервере.")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Content-Type", original.ContentType)
	w.Header().Set("Content-Disposition", mime.FormatMediaType("attachment", map[string]string{"filename": original.Filename}))
	http.ServeContent(w, r, original.Filename, time.Time{}, bytes.NewReader(original.Data))
}

func (s *Server) vucSearch(w http.ResponseWriter, r *http.Request) {
	term := strings.TrimSpace(r.URL.Query().Get("term"))
	if utf8.RuneCountInString(term) > 80 {
		fail(w, 400, "Для поиска взвода введите до 80 символов.")
		return
	}
	if s.VUC == nil {
		fail(w, 503, "Документы ВУЦ ещё не импортированы на этом сервере.")
		return
	}
	writeVucSnapshot(w, s.VUC.Search(term))
}

func (s *Server) vucWeek(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	start, err := time.ParseInLocation("2006-01-02", r.URL.Query().Get("week"), s.Location)
	if !vuc.IDPattern.MatchString(id) || err != nil || !start.Equal(schedule.Monday(start)) {
		fail(w, 400, "Выберите взвод ВУЦ и неделю с понедельника: YYYY-MM-DD.")
		return
	}
	now := time.Now().In(s.Location)
	if start.Before(schedule.Monday(now).AddDate(-2, 0, 0)) || start.After(schedule.Monday(now).AddDate(2, 0, 0)) {
		fail(w, 400, "Выберите неделю в пределах двух лет от сегодняшней даты.")
		return
	}
	if s.VUC == nil {
		fail(w, 503, "Документы ВУЦ ещё не импортированы на этом сервере.")
		return
	}
	data, found := s.VUC.Week(id, start.Format("2006-01-02"))
	if !found {
		fail(w, 404, "Такого взвода нет в импортированных документах.")
		return
	}
	writeVucSnapshot(w, data)
}

func writeVucSnapshot(w http.ResponseWriter, data any) {
	// This timestamp describes the local response, not a check of the VUC site.
	// Original document period and actual import time remain in the payload.
	now := time.Now().UTC()
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, map[string]any{"data": data, "checkedAt": now, "expiresAt": now.Add(time.Hour), "stale": true, "warning": "Локальный документ ВУЦ. Актуальность на сайте не проверена; учитывайте период источника и предупреждения."})
}
