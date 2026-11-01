import { usableSnapshot } from './cache-policy.ts';
import { isGroup } from './schedule-ref.ts';
import {
  PUBLIC_DATA_CACHE,
  publicDataTarget,
  publicSnapshotDeadline,
  readPublicResponse,
  validPublicBody,
} from './public-cache.js';
import type {
  OfflineAvailability,
  ScheduleData,
  Selection,
  Snapshot,
  Week,
} from './types.ts';

export function savedSchedulePath(ref: Selection | number, week: string) {
  if (typeof ref === 'number' || isGroup(ref))
    return `/api/schedule/${typeof ref === 'number' ? ref : ref.id}?week=${week}`;
  return ref.kind === 'vuc'
    ? `/api/vuc/${encodeURIComponent(ref.id)}?week=${week}`
    : `/api/resources/${ref.kind}/${ref.id}?week=${week}`;
}

// This is the worker's existing store, not another persistent query cache.
export async function readSavedScheduleState(
  ref: Selection | number,
  week: string,
  storage: Pick<CacheStorage, 'open'> | undefined = globalThis.caches,
  now = Date.now(),
): Promise<{
  snapshot?: Snapshot<ScheduleData>;
  offline: OfflineAvailability;
}> {
  const unavailable = { offline: { status: 'unavailable', week } } as const;
  if (!storage) return unavailable;
  try {
    const target = publicDataTarget(
      new URL(savedSchedulePath(ref, week), 'https://campus.example'),
    );
    const cache = await storage.open(PUBLIC_DATA_CACHE);
    const body = await readPublicResponse(
      await cache.match(savedSchedulePath(ref, week)),
    );
    if (!validPublicBody(target, body))
      return { offline: { status: 'missing', week } };
    const data = body as Snapshot<ScheduleData>;
    const snapshot = usableSnapshot(data, week, now);
    return {
      snapshot,
      offline: {
        status: snapshot ? 'available' : 'expired',
        week,
        checkedAt: data.checkedAt,
        usableUntil: new Date(
          publicSnapshotDeadline(data, week, now) + 86400000,
        ).toISOString(),
      },
    };
  } catch {
    return unavailable;
  }
}
export function readSavedSchedule(
  id: number,
  week: string,
  storage?: Pick<CacheStorage, 'open'>,
  now?: number,
): Promise<Snapshot<Week> | undefined>;
export function readSavedSchedule(
  ref: Selection,
  week: string,
  storage?: Pick<CacheStorage, 'open'>,
  now?: number,
): Promise<Snapshot<ScheduleData> | undefined>;
export async function readSavedSchedule(
  ref: Selection | number,
  week: string,
  storage?: Pick<CacheStorage, 'open'>,
  now?: number,
) {
  return (await readSavedScheduleState(ref, week, storage, now)).snapshot;
}
