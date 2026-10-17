import { addDays, monday, omskToday } from './dates.ts';
import type { Snapshot } from './types.ts';

const MINUTE = 60_000;
export const CACHE_RETENTION = 30 * MINUTE;
export const STALE_GRACE = 24 * 60 * MINUTE;

export const scheduleKey = (id: number, week: string) =>
  ['schedule', id, week] as const;

// A response received now can contain an older server snapshot. Receiving it
// again must never renew its freshness deadline.
export function snapshotDeadline(
  snapshot: Snapshot<unknown>,
  week: string,
  currentWeek = monday(omskToday()),
) {
  const ttl =
    week < currentWeek
      ? STALE_GRACE
      : week > currentWeek
        ? 60 * MINUTE
        : 10 * MINUTE;
  return Math.min(
    Date.parse(snapshot.expiresAt),
    Date.parse(snapshot.checkedAt) + ttl,
  );
}

export function snapshotStaleTime(
  snapshot: Snapshot<unknown> | undefined,
  week: string,
  updatedAt: number,
  currentWeek?: string,
) {
  if (!snapshot || snapshot.stale) return 0;
  const deadline = snapshotDeadline(snapshot, week, currentWeek);
  return Number.isFinite(deadline) ? Math.max(0, deadline - updatedAt) : 0;
}

export function usableSnapshot<T>(
  snapshot: Snapshot<T> | undefined,
  week: string,
  now: number,
): Snapshot<T> | undefined {
  if (!snapshot) return undefined;
  const deadline = snapshotDeadline(
    snapshot,
    week,
    monday(omskToday(new Date(now))),
  );
  if (!Number.isFinite(deadline) || now > deadline + STALE_GRACE)
    return undefined;
  if (snapshot.stale || now <= deadline) return snapshot;
  return {
    ...snapshot,
    stale: true,
    warning:
      snapshot.warning || 'Сохранённый снимок. Возможны изменения расписания.',
  };
}

// A focused, idle tab still has to mark stale data and stop using old snapshots.
// Monday can shorten a future week's TTL before its original deadline.
export function snapshotChangeAt(
  snapshot: Snapshot<unknown> | undefined,
  week: string,
  now: number,
): number | undefined {
  if (!snapshot) return undefined;
  const currentWeek = monday(omskToday(new Date(now)));
  const deadline = snapshotDeadline(snapshot, week, currentWeek);
  if (!Number.isFinite(deadline) || now > deadline + STALE_GRACE)
    return undefined;
  const change =
    snapshot.stale || now > deadline
      ? deadline + STALE_GRACE + 1
      : deadline + 1;
  const nextMonday = Date.parse(`${addDays(currentWeek, 7)}T00:00:00+06:00`);
  return Math.min(change, nextMonday);
}
