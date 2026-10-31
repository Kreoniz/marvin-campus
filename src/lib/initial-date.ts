import { usableSnapshot } from './cache-policy.ts';
import { addDays, monday, omskToday } from './dates.ts';
import { comparisonIssue, lessonsFor } from './domain.ts';
import { isGroup } from './schedule-ref.ts';
import { selectedSubgroup } from './subgroups.ts';
import type { GroupSchedule } from './types.ts';

// Capture the original URL before boot canonicalization adds a date. Saved
// workspaces may use the default; shared/readable selections keep their date.
export function implicitDateOpening(url: URL, now: Date): number | undefined {
  if (
    !['/', '/vuc'].includes(url.pathname) ||
    ['d', 'day', 'week', 'g', 's'].some((key) => url.searchParams.has(key)) ||
    new Date(`${omskToday(now)}T12:00:00Z`).getUTCDay() === 0
  )
    return;
  return now.getTime();
}

export function nextInitialDay(
  schedules: GroupSchedule[],
  openedAt: number,
  now: number,
): string | undefined {
  const today = omskToday(new Date(openedAt));
  // A slow opening that crosses midnight must not apply yesterday's decision.
  if (omskToday(new Date(now)) !== today || !schedules.length) return;
  const week = monday(today);
  for (const row of schedules) {
    if (
      row.loading ||
      row.fetching ||
      row.error ||
      !usableSnapshot(row.snapshot, week, now) ||
      comparisonIssue(row, today)
    )
      return;
    // A raw subgroup ID may outlive its catalogue entry. Known whole-group
    // lessons alone cannot prove that this subgroup has finished its day.
    const data = row.snapshot!.data;
    const subgroup = selectedSubgroup(row.selection, data.subgroups ?? []);
    if (
      isGroup(row.selection) &&
      subgroup !== undefined &&
      data.lessons.some((lesson) => lesson.subgroups.length > 0) &&
      !(data.subgroups ?? []).some((entry) => entry.id === subgroup)
    )
      return;
  }
  const lessons = schedules.flatMap((row) =>
    lessonsFor(row).filter((lesson) => lesson.date === today),
  );
  // Include remote lessons and room overlays, even when their cards are hidden.
  // Nonempty evidence is required: a free day is not an all-finished day.
  if (
    lessons.length &&
    lessons.every(
      (lesson) =>
        openedAt >= Date.parse(`${today}T00:00:00+06:00`) + lesson.end * 60_000,
    )
  )
    return addDays(today, 1);
}
