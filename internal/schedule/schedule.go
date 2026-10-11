// Package schedule translates the university API into the small public contract
// used by Campus. Times are minutes after midnight in Asia/Omsk, not UTC dates.
package schedule

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"time"
)

type Group struct {
	ID          int    `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description,omitempty"`
}

type Subgroup struct {
	ID    int    `json:"id"`
	Label string `json:"label"`
}

type Lesson struct {
	ID        string `json:"id"`
	Date      string `json:"date"`
	Start     int    `json:"start"`
	End       int    `json:"end"`
	Subject   string `json:"subject"`
	Kind      string `json:"kind"`
	Building  string `json:"building"`
	Room      string `json:"room"`
	Teacher   string `json:"teacher"`
	Remote    bool   `json:"remote"`
	Subgroups []int  `json:"subgroups"`
}

type Week struct {
	GroupID   int        `json:"groupId"`
	Lessons   []Lesson   `json:"lessons"`
	Subgroups []Subgroup `json:"subgroups"`
}

type rawSubgroup struct {
	ID      int    `json:"subgroupOid"`
	Label   string `json:"subgroup"`
	GroupID int    `json:"subgroup_groupOid"`
}

type rawLesson struct {
	ID              int           `json:"lessonOid"`
	Date            string        `json:"date"`
	Begin           string        `json:"beginLesson"`
	End             string        `json:"endLesson"`
	Subject         string        `json:"discipline"`
	Kind            string        `json:"kindOfWork"`
	Building        string        `json:"building"`
	Room            string        `json:"auditorium"`
	Teacher         string        `json:"lecturer"`
	Subgroup        string        `json:"subGroup"`
	SubgroupID      int           `json:"subGroupOid"`
	SubgroupGroupID int           `json:"subgroup_groupOid"`
	Subgroups       []rawSubgroup `json:"listSubGroups"`
}

func NormalizeWeek(data []byte, groupID int, start time.Time) ([]byte, error) {
	var raw []rawLesson
	if err := json.Unmarshal(data, &raw); err != nil || raw == nil {
		return nil, fmt.Errorf("invalid schedule array")
	}
	week := Week{GroupID: groupID, Lessons: []Lesson{}, Subgroups: []Subgroup{}}
	subgroups := map[int]string{}
	seen := map[string]bool{}
	for _, r := range raw {
		date, err := time.Parse("2006.01.02", r.Date)
		begin, beginErr := minutes(r.Begin)
		end, endErr := minutes(r.End)
		if err != nil || beginErr != nil || endErr != nil || begin >= end || strings.TrimSpace(r.Subject) == "" {
			return nil, fmt.Errorf("invalid lesson in source response")
		}
		day := date.Format("2006-01-02")
		if day < start.Format("2006-01-02") || day > start.AddDate(0, 0, 6).Format("2006-01-02") {
			return nil, fmt.Errorf("source returned a lesson outside requested week")
		}
		ids := []int{}
		add := func(id int, label string, owner int) {
			if id <= 0 || (owner != 0 && owner != groupID) {
				return
			}
			for _, existing := range ids {
				if existing == id {
					return
				}
			}
			ids = append(ids, id)
			if label == "" {
				label = fmt.Sprintf("Подгруппа %d", id)
			}
			subgroups[id] = label
		}
		for _, s := range r.Subgroups {
			add(s.ID, s.Label, s.GroupID)
		}
		add(r.SubgroupID, r.Subgroup, r.SubgroupGroupID)
		sort.Ints(ids)
		id := ""
		if r.ID > 0 {
			id = fmt.Sprint(r.ID)
		}
		lesson := Lesson{ID: id, Date: day, Start: begin, End: end, Subject: strings.TrimSpace(r.Subject), Kind: r.Kind, Building: r.Building, Room: r.Room, Teacher: r.Teacher, Remote: strings.Contains(strings.ToLower(r.Building), "виртуаль") || strings.HasPrefix(strings.ToUpper(strings.TrimSpace(r.Room)), "В.А."), Subgroups: ids}
		encoded, _ := json.Marshal(lesson)
		if !seen[string(encoded)] {
			week.Lessons = append(week.Lessons, lesson)
			seen[string(encoded)] = true
		}
	}
	for id, label := range subgroups {
		week.Subgroups = append(week.Subgroups, Subgroup{ID: id, Label: label})
	}
	sort.Slice(week.Subgroups, func(i, j int) bool { return week.Subgroups[i].Label < week.Subgroups[j].Label })
	sort.SliceStable(week.Lessons, func(i, j int) bool {
		a, b := week.Lessons[i], week.Lessons[j]
		if a.Date != b.Date {
			return a.Date < b.Date
		}
		if a.Start != b.Start {
			return a.Start < b.Start
		}
		return a.End < b.End
	})
	return json.Marshal(week)
}

func NormalizeGroups(data []byte) ([]byte, error) {
	var raw []struct {
		Group
		Type string `json:"type"`
	}
	if err := json.Unmarshal(data, &raw); err != nil || raw == nil {
		return nil, fmt.Errorf("invalid group search array")
	}
	groups := []Group{}
	for _, g := range raw {
		if g.Type != "group" {
			continue
		}
		if g.ID <= 0 || g.Label == "" {
			return nil, fmt.Errorf("invalid group in source response")
		}
		groups = append(groups, g.Group)
	}
	return json.Marshal(groups)
}

func minutes(value string) (int, error) {
	t, err := time.Parse("15:04", value)
	if err != nil {
		return 0, err
	}
	return t.Hour()*60 + t.Minute(), nil
}

func Monday(t time.Time) time.Time {
	d := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, t.Location())
	return d.AddDate(0, 0, -(int(d.Weekday())+6)%7)
}

func TTL(week, now time.Time) time.Duration {
	current := Monday(now)
	if week.Before(current) {
		return 24 * time.Hour
	}
	if week.After(current) {
		return time.Hour
	}
	return 10 * time.Minute
}
