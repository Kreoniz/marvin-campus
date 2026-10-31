package vuc

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"marvin-campus/internal/schedule"
)

func fixture() Dataset {
	hash := strings.Repeat("a", 64)
	return Dataset{Version: 1, ImportedAt: time.Now().UTC().Format(time.RFC3339), Schedules: []Entry{{Ref: Ref{Kind: "vuc", ID: "daaaaaaaaaaaa-p101", Label: "ВУЦ · взвод 101", Description: "Учебный пример", FirstDate: "2026-09-03", LastDate: "2026-09-10"}, DocumentSHA256: hash, SourceLabel: "Учебный документ", SourcePeriod: "2026-09-03 – 2026-09-10", CoveredDates: []string{"2026-09-03"}, UnresolvedDates: []string{"2026-09-10"}, Warnings: []string{"Неполный интервал"}, DateWarnings: map[string][]string{"2026-09-10": {"Неполный интервал"}}, Lessons: []Lesson{{Lesson: schedule.Lesson{ID: "vuc:aaaaaaaaaaaa:table-1:row-1:cell-2", Date: "2026-09-03", Start: 540, End: 630, Subject: "Учебный предмет", Building: "ВУЦ", Audience: "Взвод 101", Subgroups: []int{}}, Source: "vuc:aaaaaaaaaaaa", RawText: "Учебный предмет", SourceOrigin: "table-1:row-1:cell-2", SourceIntervals: []Interval{{540, 630}}}}, UnparsedCells: []UnparsedCell{{Date: "2026-09-10", RawText: "Ячейка без времени", SourceOrigin: "table-1:row-2:cell-2", Reason: "Границы не установлены"}}}}}
}

func parseFixture(t *testing.T, data Dataset) *Store {
	t.Helper()
	body, err := json.Marshal(data)
	if err != nil {
		t.Fatal(err)
	}
	store, err := Parse(body)
	if err != nil {
		t.Fatal(err)
	}
	return store
}

func TestCoverageBelongsToPlatoonAndDate(t *testing.T) {
	data := fixture()
	second := data.Schedules[0]
	second.ID = "daaaaaaaaaaaa-p102"
	second.Label = "ВУЦ · взвод 102"
	second.CoveredDates = []string{}
	second.Lessons = []Lesson{}
	data.Schedules = append(data.Schedules, second)
	store := parseFixture(t, data)
	first, ok := store.Week(data.Schedules[0].ID, "2026-08-31")
	if !ok || len(first.CoveredDates) != 1 || first.CoveredDates[0] != "2026-09-03" || len(first.Lessons) != 1 || len(first.Warnings) != 0 {
		t.Fatalf("wrong known-day projection: %+v", first)
	}
	other, ok := store.Week(second.ID, "2026-08-31")
	if !ok || len(other.CoveredDates) != 0 || len(other.Lessons) != 0 {
		t.Fatalf("inherited another platoon's coverage: %+v", other)
	}
	unknown, ok := store.Week(second.ID, "2026-10-26")
	if !ok || len(unknown.CoveredDates) != 0 || len(unknown.UnresolvedDates) != 0 || len(unknown.Lessons) != 0 {
		t.Fatal("invented coverage outside the document")
	}
	uncertain, _ := store.Week(second.ID, "2026-09-07")
	if len(uncertain.UnresolvedDates) != 1 || len(uncertain.UnparsedCells) != 1 || len(uncertain.Warnings) != 1 || uncertain.ImportedAt != data.ImportedAt {
		t.Fatalf("lost unresolved evidence: %+v", uncertain)
	}
	refs := store.Search("101")
	if len(refs) != 1 || len(refs[0].Dates) != 1 || refs[0].Dates[0] != "2026-09-03" {
		t.Fatalf("wrong catalog coverage: %+v", refs)
	}
}

func TestInvalidDocumentDataFailsClosed(t *testing.T) {
	for _, change := range []func(*Dataset){
		func(d *Dataset) { d.Schedules[0].ID = "../private" },
		func(d *Dataset) { d.Schedules[0].DocumentSHA256 = "bad" },
		func(d *Dataset) { d.Schedules[0].CoveredDates = append(d.Schedules[0].CoveredDates, "2026-09-10") },
		func(d *Dataset) { d.Schedules[0].Lessons[0].End = 1500 },
		func(d *Dataset) { d.Schedules[0].Lessons[0].Source = "rasp" },
		func(d *Dataset) { d.Schedules[0].Lessons[0].SourceOrigin = "arbitrary" },
		func(d *Dataset) {
			d.Schedules[0].Lessons[0].RoomRef = &schedule.ResourceRef{Kind: "auditorium", ID: 1, Label: "Guessed"}
		},
		func(d *Dataset) { d.Schedules[0].UnparsedCells[0].Date = "2026-09-03" },
		func(d *Dataset) {
			d.Schedules[0].Lessons[0].End = 735
			d.Schedules[0].Lessons[0].SourceIntervals = []Interval{{540, 630}, {645, 735}}
		},
	} {
		data := fixture()
		change(&data)
		body, _ := json.Marshal(data)
		if _, err := Parse(body); err == nil {
			t.Fatal("accepted unsafe source data")
		}
	}
	if _, err := Parse([]byte(strings.Repeat(" ", MaxBytes+1))); err == nil {
		t.Fatal("accepted oversized data")
	}
	body, _ := json.Marshal(fixture())
	if _, err := Parse(append(body, []byte(` {}`)...)); err == nil {
		t.Fatal("accepted trailing JSON")
	}
}

func TestMergedCellKeepsOriginalIntervalsAndExcludesUncertainDay(t *testing.T) {
	data := fixture()
	entry := &data.Schedules[0]
	entry.CoveredDates = []string{}
	entry.UnresolvedDates = []string{"2026-09-03", "2026-09-10"}
	entry.Lessons[0].End = 735
	entry.Lessons[0].SourceIntervals = []Interval{{540, 630}, {645, 735}}
	store := parseFixture(t, data)
	week, _ := store.Week(entry.ID, "2026-08-31")
	if len(week.CoveredDates) != 0 || len(week.UnresolvedDates) != 1 || len(week.Lessons[0].SourceIntervals) != 2 || week.Lessons[0].End != 735 {
		t.Fatalf("lost source envelope or uncertainty: %+v", week)
	}
}
