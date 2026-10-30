// Package vuc serves a bounded, explicitly configured local document import.
// It never downloads files or accepts public uploads.
package vuc

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"marvin-campus/internal/schedule"
)

const MaxBytes = 8 << 20

var IDPattern = regexp.MustCompile(`^d[0-9a-f]{12}-p[0-9]{3}[a-z]?$`)
var hashPattern = regexp.MustCompile(`^[0-9a-f]{64}$`)
var originPattern = regexp.MustCompile(`^(page|table)-[0-9]{1,3}:row-[0-9]{1,4}:cell-[0-9]{1,3}$`)

type Interval struct {
	Start int `json:"start"`
	End   int `json:"end"`
}

type Bounds struct {
	Left  float64 `json:"left"`
	Right float64 `json:"right"`
	Unit  string  `json:"unit"`
}

type Lesson struct {
	schedule.Lesson
	Source          string     `json:"source"`
	RawText         string     `json:"rawText"`
	SourceIntervals []Interval `json:"sourceIntervals"`
	SourceOrigin    string     `json:"sourceOrigin"`
	SourceBounds    *Bounds    `json:"sourceBounds,omitempty"`
}

type UnparsedCell struct {
	Date         string  `json:"date"`
	RawText      string  `json:"rawText"`
	SourceOrigin string  `json:"sourceOrigin"`
	SourceBounds *Bounds `json:"sourceBounds,omitempty"`
	Reason       string  `json:"reason"`
}

type Ref struct {
	Kind        string   `json:"kind"`
	ID          string   `json:"id"`
	Label       string   `json:"label"`
	Description string   `json:"description"`
	FirstDate   string   `json:"firstDate"`
	LastDate    string   `json:"lastDate"`
	Dates       []string `json:"coveredDates"`
}

type Entry struct {
	Ref
	SourceLabel     string              `json:"sourceLabel"`
	SourcePeriod    string              `json:"sourcePeriod"`
	DocumentSHA256  string              `json:"documentSHA256"`
	CoveredDates    []string            `json:"coveredDates"`
	UnresolvedDates []string            `json:"unresolvedDates"`
	Warnings        []string            `json:"warnings"`
	DateWarnings    map[string][]string `json:"dateWarnings,omitempty"`
	UnparsedCells   []UnparsedCell      `json:"unparsedCells"`
	Lessons         []Lesson            `json:"lessons"`
}

type Week struct {
	Kind            string         `json:"kind"`
	ID              string         `json:"id"`
	Lessons         []Lesson       `json:"lessons"`
	CoveredDates    []string       `json:"coveredDates"`
	UnresolvedDates []string       `json:"unresolvedDates"`
	SourceLabel     string         `json:"sourceLabel"`
	SourcePeriod    string         `json:"sourcePeriod"`
	ImportedAt      string         `json:"importedAt"`
	Warnings        []string       `json:"warnings"`
	UnparsedCells   []UnparsedCell `json:"unparsedCells"`
}

type Dataset struct {
	Version    int     `json:"version"`
	ImportedAt string  `json:"importedAt"`
	Schedules  []Entry `json:"schedules"`
}

type Store struct {
	data Dataset
}

// Load reads only the operator-configured path. An empty path disables VUC.
func Load(path string) (*Store, error) {
	if path == "" {
		return nil, nil
	}
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, MaxBytes+1))
	if err != nil {
		return nil, err
	}
	return Parse(data)
}

func Parse(data []byte) (*Store, error) {
	if len(data) > MaxBytes {
		return nil, errors.New("VUC dataset exceeds 8 MiB")
	}
	var dataset Dataset
	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&dataset); err != nil {
		return nil, fmt.Errorf("invalid VUC JSON: %w", err)
	}
	if decoder.Decode(new(any)) != io.EOF {
		return nil, errors.New("VUC dataset contains trailing JSON")
	}
	imported, err := time.Parse(time.RFC3339Nano, dataset.ImportedAt)
	if err != nil || imported.After(time.Now().Add(5*time.Minute)) || dataset.Version != 1 || len(dataset.Schedules) == 0 || len(dataset.Schedules) > 100 {
		return nil, errors.New("invalid VUC dataset metadata")
	}
	seen := map[string]bool{}
	lessons := 0
	for _, entry := range dataset.Schedules {
		if seen[entry.ID] {
			return nil, errors.New("duplicate VUC schedule identity")
		}
		seen[entry.ID] = true
		if err := validate(entry); err != nil {
			return nil, err
		}
		lessons += len(entry.Lessons)
		if lessons > 20000 {
			return nil, errors.New("VUC dataset exceeds 20000 lessons")
		}
	}
	return &Store{data: dataset}, nil
}

func validText(value string, max int, required bool) bool {
	if !utf8.ValidString(value) || utf8.RuneCountInString(value) > max || (required && strings.TrimSpace(value) == "") {
		return false
	}
	for _, char := range value {
		if unicode.IsControl(char) && char != '\n' && char != '\t' && char != '\r' {
			return false
		}
	}
	return true
}

func validDate(value string) bool {
	t, err := time.Parse("2006-01-02", value)
	return err == nil && t.Year() >= 2000 && t.Year() <= 2100
}

func validBounds(bounds *Bounds) bool {
	return bounds == nil || ((bounds.Unit == "pt" || bounds.Unit == "twip") && !math.IsNaN(bounds.Left) && !math.IsNaN(bounds.Right) && !math.IsInf(bounds.Left, 0) && !math.IsInf(bounds.Right, 0) && bounds.Left >= 0 && bounds.Right > bounds.Left && bounds.Right <= 100000)
}

func validate(entry Entry) error {
	bad := errors.New("invalid VUC schedule, coverage or lesson")
	if entry.Kind != "vuc" || !IDPattern.MatchString(entry.ID) || !hashPattern.MatchString(entry.DocumentSHA256) || !strings.HasPrefix(entry.ID, "d"+entry.DocumentSHA256[:12]+"-p") ||
		!validText(entry.Label, 160, true) || !validText(entry.Description, 600, true) || !validText(entry.SourceLabel, 200, true) || !validText(entry.SourcePeriod, 600, true) ||
		!validDate(entry.FirstDate) || !validDate(entry.LastDate) || entry.FirstDate > entry.LastDate || len(entry.Lessons) > 2000 || len(entry.Warnings) > 200 || len(entry.UnparsedCells) > 1000 || len(entry.CoveredDates)+len(entry.UnresolvedDates) > 800 {
		return bad
	}
	covered := map[string]bool{}
	unresolved := map[string]bool{}
	for _, group := range []struct {
		values []string
		known  map[string]bool
	}{{entry.CoveredDates, covered}, {entry.UnresolvedDates, unresolved}} {
		for _, day := range group.values {
			if !validDate(day) || day < entry.FirstDate || day > entry.LastDate || covered[day] || unresolved[day] {
				return bad
			}
			group.known[day] = true
		}
	}
	if len(covered)+len(unresolved) == 0 {
		return bad
	}
	for _, warning := range entry.Warnings {
		if !validText(warning, 600, true) {
			return bad
		}
	}
	if len(entry.DateWarnings) > 800 {
		return bad
	}
	for day, warnings := range entry.DateWarnings {
		if !unresolved[day] || len(warnings) == 0 || len(warnings) > 20 {
			return bad
		}
		for _, warning := range warnings {
			if !validText(warning, 600, true) {
				return bad
			}
		}
	}
	ids := map[string]bool{}
	for _, lesson := range entry.Lessons {
		if ids[lesson.ID] || !validBounds(lesson.SourceBounds) || !originPattern.MatchString(lesson.SourceOrigin) || lesson.ID != "vuc:"+entry.DocumentSHA256[:12]+":"+lesson.SourceOrigin || lesson.Source != "vuc:"+entry.DocumentSHA256[:12] ||
			(!covered[lesson.Date] && !unresolved[lesson.Date]) || lesson.Start < 0 || lesson.End > 1440 || lesson.Start >= lesson.End ||
			!validText(lesson.Subject, 600, true) || !validText(lesson.Kind, 100, false) || !validText(lesson.Room, 300, false) || !validText(lesson.Teacher, 1000, false) ||
			!validText(lesson.Building, 100, true) || !validText(lesson.Audience, 200, true) || !validText(lesson.RawText, 3000, true) || lesson.Remote || len(lesson.Subgroups) != 0 || len(lesson.Teachers) != 0 || lesson.RoomRef != nil || len(lesson.SourceIntervals) == 0 || len(lesson.SourceIntervals) > 6 {
			return bad
		}
		ids[lesson.ID] = true
		for i, interval := range lesson.SourceIntervals {
			if interval.Start < lesson.Start || interval.End > lesson.End || interval.Start >= interval.End ||
				(i == 0 && interval.Start != lesson.Start) || (i == len(lesson.SourceIntervals)-1 && interval.End != lesson.End) ||
				(i > 0 && interval.Start < lesson.SourceIntervals[i-1].End) ||
				(i > 0 && interval.Start > lesson.SourceIntervals[i-1].End && !unresolved[lesson.Date]) {
				return bad
			}
		}
	}
	for _, cell := range entry.UnparsedCells {
		if !unresolved[cell.Date] || !validBounds(cell.SourceBounds) || !validText(cell.RawText, 3000, true) || !validText(cell.Reason, 600, true) || !originPattern.MatchString(cell.SourceOrigin) {
			return bad
		}
	}
	return nil
}

func (s *Store) Search(term string) []Ref {
	result := []Ref{}
	term = strings.ToUpper(strings.TrimSpace(term))
	for _, entry := range s.data.Schedules {
		if term == "" || strings.Contains(strings.ToUpper(entry.Label+" "+entry.Description), term) {
			ref := entry.Ref
			ref.Dates = append([]string{}, entry.CoveredDates...)
			sort.Strings(ref.Dates)
			result = append(result, ref)
		}
	}
	return result
}

func (s *Store) Week(id, start string) (Week, bool) {
	from, err := time.Parse("2006-01-02", start)
	if err != nil {
		return Week{}, false
	}
	last := from.AddDate(0, 0, 6).Format("2006-01-02")
	inside := func(day string) bool { return day >= start && day <= last }
	for _, entry := range s.data.Schedules {
		if entry.ID != id {
			continue
		}
		week := Week{Kind: "vuc", ID: id, Lessons: []Lesson{}, CoveredDates: []string{}, UnresolvedDates: []string{}, SourceLabel: entry.SourceLabel, SourcePeriod: entry.SourcePeriod, ImportedAt: s.data.ImportedAt, Warnings: []string{}, UnparsedCells: []UnparsedCell{}}
		if len(entry.DateWarnings) == 0 {
			week.Warnings = append(week.Warnings, entry.Warnings...)
		} else {
			unique := map[string]bool{}
			for day, warnings := range entry.DateWarnings {
				if inside(day) {
					for _, warning := range warnings {
						unique[warning] = true
					}
				}
			}
			for warning := range unique {
				week.Warnings = append(week.Warnings, warning)
			}
			sort.Strings(week.Warnings)
		}
		for _, lesson := range entry.Lessons {
			if inside(lesson.Date) {
				week.Lessons = append(week.Lessons, lesson)
			}
		}
		for _, day := range entry.CoveredDates {
			if inside(day) {
				week.CoveredDates = append(week.CoveredDates, day)
			}
		}
		for _, day := range entry.UnresolvedDates {
			if inside(day) {
				week.UnresolvedDates = append(week.UnresolvedDates, day)
			}
		}
		for _, cell := range entry.UnparsedCells {
			if inside(cell.Date) {
				week.UnparsedCells = append(week.UnparsedCells, cell)
			}
		}
		sort.SliceStable(week.Lessons, func(i, j int) bool {
			a, b := week.Lessons[i], week.Lessons[j]
			return a.Date < b.Date || (a.Date == b.Date && (a.Start < b.Start || (a.Start == b.Start && a.ID < b.ID)))
		})
		return week, true
	}
	return Week{}, false
}
