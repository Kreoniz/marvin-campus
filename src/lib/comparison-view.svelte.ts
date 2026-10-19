import type { Group, Mode, Selection, Subgroup } from './types.ts';
import type { ViewState } from './url.ts';
import { addDays, monday, omskToday, validDate } from './dates.ts';
import { track } from './analytics.ts';
import { selectionData } from './selection-analytics.ts';
import { publicSubgroup } from './subgroups.ts';

export type Notify = (
  message: string,
  kind?: 'success' | 'error' | 'info',
) => void;

// One instance per comparison. Server responses and transient popup state do
// not belong to the selected view.
export function createComparisonView(
  initial: ViewState,
  changed: () => void,
  notify: Notify,
  catalog: () => Record<number, Subgroup[]>,
) {
  let groups = $state<Selection[]>(initial.groups);
  let week = $state(initial.week),
    day = $state(initial.day),
    mode = $state<Mode>(initial.mode);
  function current(): ViewState {
    return {
      groups: groups.map(({ id, label, subgroup, subgroupNumber }) => ({
        id,
        label,
        subgroup,
        subgroupNumber,
      })),
      week,
      day,
      mode,
    };
  }
  function apply(view: ViewState) {
    groups = view.groups;
    week = view.week;
    day = view.day;
    mode = view.mode;
  }
  function reorder(next: Selection[]) {
    groups = next;
    changed();
    track('groups_reordered', { group_count: groups.length });
  }
  function selectDate(value: string) {
    if (!validDate(value)) return;
    week = monday(value);
    day = value;
    changed();
    track('date_selected');
  }
  return {
    get groups() {
      return groups;
    },
    get week() {
      return week;
    },
    get day() {
      return day;
    },
    get mode() {
      return mode;
    },
    current,
    apply,
    reorder,
    selectDate,
    add(group: Group) {
      if (groups.length >= 30 || groups.some((g) => g.id === group.id)) return;
      groups = [...groups, group];
      changed();
      notify(`${group.label} добавлена.`);
      track('group_added', {
        ...selectionData(group),
        group_count: groups.length,
      });
    },
    remove(id: number) {
      const removed = groups.find((g) => g.id === id);
      if (!removed) return;
      groups = groups.filter((g) => g.id !== id);
      changed();
      notify(`${removed.label} убрана из сравнения.`);
      track('group_removed', {
        ...selectionData(removed),
        group_count: groups.length,
      });
    },
    subgroup(id: number, value?: number) {
      const number = publicSubgroup(
        catalog()[id]?.find((s) => s.id === value)?.label ?? '',
      );
      groups = groups.map((g) =>
        g.id === id ? { ...g, subgroup: value, subgroupNumber: number } : g,
      );
      changed();
      const group = groups.find((g) => g.id === id);
      if (group)
        track('subgroup_changed', {
          ...selectionData(group),
        });
    },
    resolveSubgroups(known: Record<number, Subgroup[]>) {
      let updated = false;
      const next = groups.map((group) => {
        const options = known[group.id] ?? [];
        const match = group.subgroup
          ? options.find((s) => s.id === group.subgroup)
          : group.subgroupNumber
            ? options.find(
                (s) => publicSubgroup(s.label) === group.subgroupNumber,
              )
            : undefined;
        if (!match) return group;
        const number = publicSubgroup(match.label);
        if (group.subgroup === match.id && group.subgroupNumber === number)
          return group;
        updated = true;
        return { ...group, subgroup: match.id, subgroupNumber: number };
      });
      if (updated) groups = next;
      return updated;
    },
    selectWeek(value: string) {
      if (!validDate(value)) return;
      const offset = Math.round(
        (Date.parse(day) - Date.parse(week)) / 86400000,
      );
      week = monday(value);
      day = addDays(week, offset);
      changed();
      const currentWeek = monday(omskToday());
      track('week_changed', {
        week_relation:
          week < currentWeek
            ? 'past'
            : week > currentWeek
              ? 'future'
              : 'current',
      });
    },
    selectDay(value: string) {
      if (validDate(value) && monday(value) === week) {
        day = value;
        changed();
        track('day_changed');
      }
    },
    selectMode(value: Mode) {
      mode = value;
      changed();
      track('mode_changed', { mode });
    },
    move(id: number, offset: number) {
      const index = groups.findIndex((g) => g.id === id),
        target = index + offset;
      if (index < 0 || target < 0 || target >= groups.length) return;
      const next = groups.slice();
      [next[index], next[target]] = [next[target], next[index]];
      reorder(next);
    },
    example() {
      groups = [
        { id: 373, label: 'ИВТ-241' },
        { id: 374, label: 'ИВТ-242' },
      ];
      changed();
    },
  };
}
export type ComparisonView = ReturnType<typeof createComparisonView>;
