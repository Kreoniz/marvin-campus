package schedule

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type ResourceWeek struct {
	Kind    string   `json:"kind"`
	ID      int      `json:"id"`
	Lessons []Lesson `json:"lessons"`
}

func ResourceKind(kind string) bool {
	return kind == "lecturer" || kind == "auditorium"
}

func NormalizeResources(data []byte, kind string) ([]byte, error) {
	if !ResourceKind(kind) {
		return nil, fmt.Errorf("invalid resource kind")
	}
	var raw []struct {
		Group
		Type string `json:"type"`
	}
	if err := json.Unmarshal(data, &raw); err != nil || raw == nil {
		return nil, fmt.Errorf("invalid resource search array")
	}
	result := []ResourceRef{}
	seen := map[int]bool{}
	for _, item := range raw {
		if item.Type != kind {
			continue
		}
		if item.ID <= 0 || item.ID > 10000000 || strings.TrimSpace(item.Label) == "" {
			return nil, fmt.Errorf("invalid resource in search response")
		}
		if seen[item.ID] {
			continue
		}
		seen[item.ID] = true
		result = append(result, ResourceRef{Kind: kind, ID: item.ID, Label: strings.TrimSpace(item.Label), Description: strings.TrimSpace(item.Description)})
	}
	return json.Marshal(result)
}

func NormalizeResourceWeek(data []byte, kind string, id int, start time.Time) ([]byte, error) {
	if !ResourceKind(kind) || id <= 0 || id > 10000000 {
		return nil, fmt.Errorf("invalid resource")
	}
	week, err := normalizeWeek(data, 0, start)
	if err != nil {
		return nil, err
	}
	return json.Marshal(ResourceWeek{Kind: kind, ID: id, Lessons: week.Lessons})
}
