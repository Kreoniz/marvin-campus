package schedule

import (
	"encoding/json"
	"testing"
	"time"
)

func TestNormalization(t *testing.T) {
	data := []byte(`[{"lessonOid":42,"date":"2026.10.12","beginLesson":"09:40","endLesson":"11:10","discipline":"Анализ","building":"Виртуальное","auditorium":"В.А.25","listSubGroups":[{"subgroupOid":596,"subgroup":"ИВТ-241/2","subgroup_groupOid":373},{"subgroupOid":999,"subgroup":"Другая/1","subgroup_groupOid":374}]}]`)
	start, _ := time.Parse("2006-01-02", "2026-10-12")
	encoded, err := NormalizeWeek(data, 373, start)
	if err != nil {
		t.Fatal(err)
	}
	var week Week
	_ = json.Unmarshal(encoded, &week)
	if len(week.Lessons) != 1 || !week.Lessons[0].Remote || week.Lessons[0].Start != 580 || len(week.Lessons[0].Subgroups) != 1 || len(week.Subgroups) != 1 || week.Subgroups[0].ID != 596 {
		t.Fatalf("bad normalization: %+v", week)
	}
}

func TestInvalidAndEmptySource(t *testing.T) {
	start, _ := time.Parse("2006-01-02", "2026-10-12")
	for _, data := range []string{`null`, `{}`, `<html>blocked</html>`, `[{"discipline":"X","date":"bad","beginLesson":"08:00","endLesson":"09:00"}]`} {
		if _, err := NormalizeWeek([]byte(data), 1, start); err == nil {
			t.Fatalf("accepted %s", data)
		}
	}
	data, err := NormalizeWeek([]byte(`[]`), 1, start)
	if err != nil || string(data) != `{"groupId":1,"lessons":[],"subgroups":[]}` {
		t.Fatalf("empty response: %s %v", data, err)
	}
}

func TestFreshness(t *testing.T) {
	loc, _ := time.LoadLocation("Asia/Omsk")
	now := time.Date(2026, 10, 11, 23, 0, 0, 0, loc)
	week := Monday(now)
	if week.Day() != 5 || TTL(week, now) != 10*time.Minute || TTL(week.AddDate(0, 0, -7), now) != 24*time.Hour || TTL(week.AddDate(0, 0, 7), now) != time.Hour {
		t.Fatal("wrong week policy")
	}
}
