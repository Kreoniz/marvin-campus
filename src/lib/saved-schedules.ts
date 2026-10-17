import { addDays } from './dates.ts';
import { usableSnapshot } from './cache-policy.ts';
import type { Snapshot, Week } from './types.ts';

// This is the worker's existing store, not another persistent query cache.
const DATA_CACHE = 'campus-public-data-v1';

export async function readSavedSchedule(
  id: number,
  week: string,
  storage: Pick<CacheStorage, 'open'> | undefined = globalThis.caches,
  now = Date.now(),
): Promise<Snapshot<Week> | undefined> {
  if (!storage) return undefined;
  try {
    const cache = await storage.open(DATA_CACHE);
    const response = await cache.match(`/api/schedule/${id}?week=${week}`);
    if (!response?.ok) return undefined;
    const body = await response.json();
    if (
      body?.data?.groupId !== id ||
      !Array.isArray(body.data.lessons) ||
      !Array.isArray(body.data.subgroups) ||
      typeof body.stale !== 'boolean' ||
      !Number.isFinite(Date.parse(body.checkedAt)) ||
      !Number.isFinite(Date.parse(body.expiresAt)) ||
      !body.data.lessons.every(
        (lesson: Week['lessons'][number]) =>
          lesson &&
          typeof lesson.date === 'string' &&
          lesson.date >= week &&
          lesson.date <= addDays(week, 6),
      )
    )
      return undefined;
    return usableSnapshot(body, week, now);
  } catch {
    // CacheStorage may be unavailable or evicted. The normal request continues.
    return undefined;
  }
}
