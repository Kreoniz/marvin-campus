import { comparisonIssue, lessonsFor } from './domain.ts';
import { selectionKind } from './schedule-ref.ts';
import type { GroupSchedule, ScheduleKind } from './types.ts';

export function dayContent(
  schedules: GroupSchedule[],
  date: string,
  hiddenKinds: ScheduleKind[] = [],
) {
  const lessons = schedules.flatMap((schedule) =>
    lessonsFor(schedule).filter((lesson) => lesson.date === date),
  );
  const issues = schedules.flatMap((schedule) => {
    const issue = comparisonIssue(schedule, date);
    return issue ? [issue] : [];
  });
  return {
    hasLessons: lessons.length > 0,
    hiddenLessons: schedules.some(
      (schedule) =>
        hiddenKinds.includes(selectionKind(schedule.selection)) &&
        lessonsFor(schedule).some((lesson) => lesson.date === date),
    ),
    knownEmpty: schedules.length > 0 && !issues.length && !lessons.length,
    issues,
    loading: schedules.some(
      (schedule) => schedule.loading && !schedule.snapshot,
    ),
    unavailable: schedules.some(
      (schedule) => schedule.error && !schedule.snapshot,
    ),
    saved: schedules.some(
      (schedule) =>
        schedule.snapshot && (schedule.snapshot.stale || schedule.error),
    ),
  };
}
