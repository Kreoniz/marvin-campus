package share

import (
	"context"
	"encoding/json"
	"errors"
	"path/filepath"
	"reflect"
	"testing"
)

func TestLegacyViewsSurviveReopeningAndRejectInvalidIDs(t *testing.T) {
	path := filepath.Join(t.TempDir(), "campus.sqlite")
	store, err := Open(path)
	if err != nil {
		t.Fatal(err)
	}
	subgroup := 591
	view := View{Groups: []Group{{ID: 370, Label: "ИВТ-233", Subgroup: &subgroup}, {ID: 694, Label: "ФИТ-232"}}, Week: "2026-10-05", Day: "2026-10-11", Mode: "presence"}
	payload, _ := json.Marshal(view)
	const id = "AbCd1234_-56"
	if _, err := store.db.Exec("INSERT INTO shared_views VALUES(?,?,0)", id, payload); err != nil {
		t.Fatal(err)
	}
	store.Close()
	store, err = Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	restored, err := store.Get(context.Background(), id)
	if err != nil || !reflect.DeepEqual(restored, view) {
		t.Fatalf("restored=%+v err=%v", restored, err)
	}
	for _, invalid := range []string{"aaaaaaaaaaaa", "../campus.sqlite", "", "AbCd1234_-56'"} {
		if _, err := store.Get(context.Background(), invalid); !errors.Is(err, ErrNotFound) {
			t.Fatalf("invalid ID: %v", err)
		}
	}
	if _, err := store.db.Exec("INSERT INTO shared_views VALUES('bbbbbbbbbbbb','invalid JSON',0)"); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Get(context.Background(), "bbbbbbbbbbbb"); err == nil {
		t.Fatal("corrupt view accepted")
	}
	store.Close()
	if _, err := store.Get(context.Background(), id); err == nil || errors.Is(err, ErrNotFound) {
		t.Fatalf("unavailable database treated as missing: %v", err)
	}
}
