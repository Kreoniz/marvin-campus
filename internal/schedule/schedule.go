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

type ResourceRef struct {
	Kind        string `json:"kind"`
	ID          int    `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description,omitempty"`
}

type Lesson struct {
	ID        string        `json:"id"`
	Date      string        `json:"date"`
	Start     int           `json:"start"`
	End       int           `json:"end"`
	Subject   string        `json:"subject"`
	Kind      string        `json:"kind"`
	Building  string        `json:"building"`
	Room      string        `json:"room"`
	Teacher   string        `json:"teacher"`
	Remote    bool          `json:"remote"`
	Subgroups []int         `json:"subgroups"`
	Teachers  []ResourceRef `json:"teachers,omitempty"`
	RoomRef   *ResourceRef  `json:"roomRef,omitempty"`
	Audience  string        `json:"audience,omitempty"`
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
	ID        int    `json:"lessonOid"`
	Date      string `json:"date"`
	Begin     string `json:"beginLesson"`
	End       string `json:"endLesson"`
	Subject   string `json:"discipline"`
	Kind      string `json:"kindOfWork"`
	Building  string `json:"building"`
	Room      string `json:"auditorium"`
	Teacher   string `json:"lecturer"`
	TeacherID int    `json:"lecturerOid"`
	Teachers  []struct {
		ID    int    `json:"lecturerOid"`
		Label string `json:"lecturer"`
	} `json:"listOfLecturers"`
	RoomID int    `json:"auditoriumOid"`
	Group  string `json:"group"`
	Groups []struct {
		Label string `json:"group"`
	} `json:"listGroups"`
	Stream          string        `json:"stream"`
	Subgroup        string        `json:"subGroup"`
	SubgroupID      int           `json:"subGroupOid"`
	SubgroupGroupID int           `json:"subgroup_groupOid"`
	Subgroups       []rawSubgroup `json:"listSubGroups"`
}

func NormalizeWeek(data []byte, groupID int, start time.Time) ([]byte, error) {
	week, err := normalizeWeek(data, groupID, start)
	if err != nil {
		return nil, err
	}
	return json.Marshal(week)
}

// The resource projection shares lesson validation while keeping group-only
// subgroup membership out of teacher and room schedules.
func normalizeWeek(data []byte, groupID int, start time.Time) (Week, error) {
	var raw []rawLesson
	if err := json.Unmarshal(data, &raw); err != nil || raw == nil {
		return Week{}, fmt.Errorf("invalid schedule array")
	}
	week := Week{GroupID: groupID, Lessons: []Lesson{}, Subgroups: []Subgroup{}}
	subgroups := map[int]string{}
	seen := map[string]bool{}
	for _, r := range raw {
		date, err := time.Parse("2006.01.02", r.Date)
		begin, beginErr := minutes(r.Begin)
		end, endErr := minutes(r.End)
		if err != nil || beginErr != nil || endErr != nil || begin >= end || strings.TrimSpace(r.Subject) == "" {
			return Week{}, fmt.Errorf("invalid lesson in source response")
		}
		day := date.Format("2006-01-02")
		if day < start.Format("2006-01-02") || day > start.AddDate(0, 0, 6).Format("2006-01-02") {
			return Week{}, fmt.Errorf("source returned a lesson outside requested week")
		}
		ids := []int{}
		add := func(id int, label string, owner int) {
			if groupID <= 0 || id <= 0 || (owner != 0 && owner != groupID) {
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
		lesson.Teachers = teacherRefs(r)
		if !lesson.Remote && r.RoomID > 0 && r.RoomID <= 10000000 && strings.TrimSpace(r.Room) != "" {
			lesson.RoomRef = &ResourceRef{Kind: "auditorium", ID: r.RoomID, Label: strings.TrimSpace(r.Room), Description: strings.TrimSpace(r.Building)}
		}
		labels := []string{}
		for _, g := range r.Groups {
			if label := strings.TrimSpace(g.Label); label != "" {
				labels = append(labels, label)
			}
		}
		if len(labels) > 0 {
			lesson.Audience = strings.Join(labels, ", ")
		} else if strings.TrimSpace(r.Group) != "" {
			lesson.Audience = strings.TrimSpace(r.Group)
		} else {
			lesson.Audience = strings.TrimSpace(r.Stream)
		}
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
	return week, nil
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
	return 30 * time.Minute
}

func teacherRefs(r rawLesson) []ResourceRef {
	refs := []ResourceRef{}
	add := func(id int, label string) {
		if id <= 0 || id > 10000000 || strings.TrimSpace(label) == "" {
			return
		}
		for _, ref := range refs {
			if ref.ID == id {
				return
			}
		}
		refs = append(refs, ResourceRef{Kind: "lecturer", ID: id, Label: strings.TrimSpace(label)})
	}
	for _, teacher := range r.Teachers {
		add(teacher.ID, teacher.Label)
	}
	add(r.TeacherID, r.Teacher)
	return refs
}
