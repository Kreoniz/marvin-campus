package httpapi

import (
	"errors"
	"marvin-campus/internal/share"
	"net/http"
)

func (s *Server) readShare(w http.ResponseWriter, r *http.Request) {
	view, err := s.Shares.Get(r.Context(), r.PathValue("id"))
	if errors.Is(err, share.ErrNotFound) {
		fail(w, 404, "Ссылка на сравнение не найдена.")
		return
	}
	if err != nil {
		fail(w, 503, "Не удалось открыть сравнение. Попробуй позже.")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	writeJSON(w, 200, view)
}
