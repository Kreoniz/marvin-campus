import { monday, omskToday } from './dates.ts';
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
  if (!snapshot || now > snapshotDeadline(snapshot, week) + STALE_GRACE)
    return undefined;
  if (snapshot.stale || now <= snapshotDeadline(snapshot, week))
    return snapshot;
  return {
    ...snapshot,
    stale: true,
    warning: snapshot.warning || 'Снимок устарел. Обновляем данные источника.',
  };
}
