import type { DayResult, GroupSchedule, Interval, Lesson } from './types.ts';
import { selectedSubgroup } from './subgroups.ts';

export function forSelection(lessons: Lesson[], subgroup?: number): Lesson[] {
  return subgroup === undefined
    ? lessons
    : lessons.filter(
        (lesson) =>
          lesson.subgroups.length === 0 || lesson.subgroups.includes(subgroup),
      );
}

export function lessonsFor(group: GroupSchedule): Lesson[] {
  return forSelection(
    group.snapshot?.data.lessons ?? [],
    selectedSubgroup(group.selection, group.snapshot?.data.subgroups ?? []),
  );
}

export function merge(intervals: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const interval of intervals
    .filter((i) => i.start < i.end)
    .sort((a, b) => a.start - b.start || a.end - b.end)) {
    const previous = result.at(-1);
    if (previous && interval.start <= previous.end)
      previous.end = Math.max(previous.end, interval.end);
    else result.push({ ...interval });
  }
  return result;
}

export function subtract(range: Interval, occupied: Interval[]): Interval[] {
  const result: Interval[] = [];
  let cursor = range.start;
  for (const interval of merge(occupied)) {
    if (interval.end <= cursor || interval.start >= range.end) continue;
    if (interval.start > cursor)
      result.push({ start: cursor, end: Math.min(interval.start, range.end) });
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < range.end) result.push({ start: cursor, end: range.end });
  return result;
}

// Identity uses the source event ID AND its occurrence/details. Similar-looking
// events from different groups must never become an alleged joint lesson.
export function lessonKey(lesson: Lesson): string {
  return JSON.stringify([
    lesson.id,
    lesson.date,
    lesson.start,
    lesson.end,
    lesson.subject,
    lesson.kind,
    lesson.building,
    lesson.room,
    lesson.remote,
  ]);
}

export function compareDay(
  schedules: GroupSchedule[],
  date: string,
): DayResult {
  const empty = { presence: [], free: [], lessons: [], complete: false };
  if (schedules.length < 2 || schedules.some((group) => !group.snapshot))
    return empty;
  const days = schedules.map((group) =>
    lessonsFor(group).filter((lesson) => lesson.date === date),
  );
  const identities = days
    .slice(1)
    .map(
      (day) => new Set(day.filter((lesson) => lesson.id !== '').map(lessonKey)),
    );
  const common = [
    ...new Map(
      days[0]
        .filter(
          (lesson) =>
            lesson.id !== '' &&
            identities.every((set) => set.has(lessonKey(lesson))),
        )
        .map((lesson) => [lessonKey(lesson), lesson]),
    ).values(),
  ];
  const ranges = days.map((day) => {
    const onsite = day.filter((lesson) => !lesson.remote);
    return onsite.length
      ? {
          start: Math.min(...onsite.map((l) => l.start)),
          end: Math.max(...onsite.map((l) => l.end)),
        }
      : undefined;
  });
  if (ranges.some((range) => !range))
    return { presence: [], free: [], lessons: common, complete: true };
  const range = {
    start: Math.max(...ranges.map((r) => r!.start)),
    end: Math.min(...ranges.map((r) => r!.end)),
  };
  return {
    presence: range.start < range.end ? [range] : [],
    free: range.start < range.end ? subtract(range, days.flat()) : [],
    lessons: common,
    complete: true,
  };
}
