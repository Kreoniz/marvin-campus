import { comparisonIssue, lessonsFor } from './domain.ts';
import { usableSnapshot } from './cache-policy.ts';
import { isGroup } from './schedule-ref.ts';
import { monday, omskToday } from './dates.ts';
import type { GroupSchedule, Lesson } from './types.ts';

export function currentOrNextLessons(
  schedules: GroupSchedule[],
  selectedDate: string,
  now: Date,
):
  | {
      state: 'lesson' | 'between' | 'none';
      lessons: Lesson[];
      saved: boolean;
      hadLessons: boolean;
    }
  | undefined {
  if (schedules.length !== 1 || selectedDate !== omskToday(now)) return;
  const selected = schedules[0];
  if (!isGroup(selected.selection) && selected.selection.kind !== 'vuc') return;
  const snapshot = usableSnapshot(
    selected.snapshot,
    monday(selectedDate),
    now.getTime(),
  );
  const schedule = { ...selected, snapshot };
  if (!snapshot || comparisonIssue(schedule, selectedDate)) return;
  const saved = !!(snapshot.stale || selected.error);
  const clock = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Omsk',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(now)
    .split(':')
    .map(Number);
  const minute = clock[0] * 60 + clock[1];
  const lessons = lessonsFor(schedule)
    .filter((lesson) => lesson.date === selectedDate)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const qualification = { saved, hadLessons: lessons.length > 0 };
  const active = lessons.filter(
    (lesson) => lesson.start <= minute && minute < lesson.end,
  );
  if (active.length)
    return { state: 'lesson', lessons: active, ...qualification };
  const next = lessons.filter((lesson) => lesson.start > minute);
  if (next.length) {
    const start = next[0].start;
    return {
      ...qualification,
      state: 'between',
      lessons: next.filter((lesson) => lesson.start === start),
    };
  }
  return { state: 'none', lessons: [], ...qualification };
}
