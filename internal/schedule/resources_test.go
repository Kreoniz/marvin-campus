package schedule

import (
	"encoding/json"
	"strings"
	"testing"
	"time"
)

func TestResourceNormalizationKeepsCanonicalRefsWithoutRawFields(t *testing.T) {
	start, _ := time.Parse("2006-01-02", "2026-10-26")
	raw := []byte(`[{"lessonOid":42,"date":"2026.10.26","beginLesson":"09:00","endLesson":"10:30","discipline":"Предмет","kindOfWork":"Лекция","building":"Корпус 8","auditorium":"8-201","auditoriumOid":15,"lecturer":"Преподаватель А","lecturerOid":12,"listOfLecturers":[{"lecturerOid":12,"lecturer":"Преподаватель А","lecturerEmail":"private@example.test"},{"lecturerOid":13,"lecturer":"Преподаватель Б"},{"lecturerOid":0,"lecturer":"Вакант"}],"stream":"Поток(ТСТ-1, ТСТ-2)","listGroups":[],"author":"private operator","listSubGroups":[{"subgroupOid":21,"subgroup":"ТСТ-1/1","subgroup_groupOid":1}]}]`)
	encoded, err := NormalizeResourceWeek(raw, "lecturer", 12, start)
	if err != nil {
		t.Fatal(err)
	}
	var week ResourceWeek
	if err := json.Unmarshal(encoded, &week); err != nil {
		t.Fatal(err)
	}
	if week.Kind != "lecturer" || week.ID != 12 || len(week.Lessons) != 1 {
		t.Fatalf("wrong owner: %+v", week)
	}
	lesson := week.Lessons[0]
	if len(lesson.Teachers) != 2 || lesson.Teachers[1].ID != 13 || lesson.RoomRef == nil || lesson.RoomRef.ID != 15 || lesson.Audience != "Поток(ТСТ-1, ТСТ-2)" || len(lesson.Subgroups) != 0 {
		t.Fatalf("wrong normalized fields: %+v", lesson)
	}
	for _, forbidden := range []string{"groupId", "lecturerEmail", "private@example", "author", "private operator"} {
		if strings.Contains(string(encoded), forbidden) {
			t.Fatalf("leaked %s", forbidden)
		}
	}
}

func TestResourceSearchFiltersKindAndKeepsDistinctIDs(t *testing.T) {
	raw := []byte(`[{"id":7,"label":"ТСТ-7","type":"group"},{"id":7,"label":"Преподаватель","type":"lecturer"},{"id":7,"label":"Аудитория","type":"auditorium"}]`)
	for _, kind := range []string{"lecturer", "auditorium"} {
		encoded, err := NormalizeResources(raw, kind)
		if err != nil {
			t.Fatal(err)
		}
		var items []ResourceRef
		_ = json.Unmarshal(encoded, &items)
		if len(items) != 1 || items[0].Kind != kind || items[0].ID != 7 {
			t.Fatalf("wrong typed results: %s", encoded)
		}
	}
	if _, err := NormalizeResources(raw, "student"); err == nil {
		t.Fatal("accepted unsupported type")
	}
}

func TestResourceEmptyErrorsAndVirtualRoom(t *testing.T) {
	start, _ := time.Parse("2006-01-02", "2026-10-26")
	encoded, err := NormalizeResourceWeek([]byte(`[]`), "auditorium", 7, start)
	if err != nil || string(encoded) != `{"kind":"auditorium","id":7,"lessons":[]}` {
		t.Fatalf("bad empty response: %s %v", encoded, err)
	}
	for _, data := range []string{`null`, `{}`, `[{"date":"2026.11.02","beginLesson":"09:00","endLesson":"10:00","discipline":"X"}]`} {
		if _, err := NormalizeResourceWeek([]byte(data), "auditorium", 7, start); err == nil {
			t.Fatal("accepted invalid source")
		}
	}
	data := []byte(`[{"date":"2026.10.26","beginLesson":"09:00","endLesson":"10:00","discipline":"X","building":"Виртуальное","auditorium":"В.А.25","auditoriumOid":7,"lecturer":"Вакант","lecturerOid":0}]`)
	encoded, err = NormalizeResourceWeek(data, "lecturer", 7, start)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(string(encoded), "roomRef") || strings.Contains(string(encoded), "teachers") {
		t.Fatal("created a clickable reference from a virtual room or missing person ID")
	}
}
