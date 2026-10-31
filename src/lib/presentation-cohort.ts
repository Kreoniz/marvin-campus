import { scheduleKey } from './schedule-ref.ts';
import { usableSnapshot } from './cache-policy.ts';
import type { GroupSchedule } from './types.ts';

export const INITIAL_REVEAL_MS = 2_000;
export const LATE_REVEAL_MS = 1_200;

export interface PresentationCohort {
  key: string;
  scope?: string;
  startedAt: number;
  entries?: GroupSchedule[];
  changedAt?: number;
}

function sameEntries(a: GroupSchedule[], b: GroupSchedule[]) {
  const previous = new Map(
    a.map((entry) => [scheduleKey(entry.selection), entry]),
  );
  return (
    a.length === b.length &&
    b.every((entry) => {
      const old = previous.get(scheduleKey(entry.selection));
      return (
        old &&
        old.error === entry.error &&
        old.loading === entry.loading &&
        old.snapshot?.data === entry.snapshot?.data &&
        old.snapshot?.checkedAt === entry.snapshot?.checkedAt &&
        old.snapshot?.expiresAt === entry.snapshot?.expiresAt &&
        old.snapshot?.stale === entry.snapshot?.stale &&
        old.snapshot?.warning === entry.snapshot?.warning
      );
    })
  );
}

// Query caches remain independent. Only publication is coalesced, so a slow
// request cannot repeatedly rebuild the calendar or hold known data forever.
export function advanceCohort(
  previous: PresentationCohort | undefined,
  key: string,
  entries: GroupSchedule[],
  now: number,
  scope?: string,
): { state: PresentationCohort; wakeAt?: number } {
  let state: PresentationCohort;
  if (previous?.key === key) state = previous;
  else {
    const retained =
      scope && previous?.scope === scope
        ? new Map(
            previous.entries?.map((entry) => [
              scheduleKey(entry.selection),
              entry,
            ]),
          )
        : undefined;
    const rebased = entries.map(
      (entry) => retained?.get(scheduleKey(entry.selection)) ?? entry,
    );
    state = {
      key,
      scope,
      startedAt: now,
      // An added schedule must not blank already visible, same-week inputs.
      // New-week content has a different scope and is never retained here.
      entries:
        retained && rebased.some((entry) => entry.snapshot)
          ? rebased
          : undefined,
    };
  }
  const settled = entries.every((entry) => !entry.fetching);
  if (!state.entries) {
    const ready = entries.every((entry) => entry.snapshot || !entry.loading);
    if (settled || ready || now >= state.startedAt + INITIAL_REVEAL_MS) {
      return { state: { ...state, entries, changedAt: undefined } };
    }
    return { state, wakeAt: state.startedAt + INITIAL_REVEAL_MS };
  }
  if (sameEntries(state.entries, entries)) {
    return {
      state:
        state.changedAt === undefined
          ? state
          : { ...state, changedAt: undefined },
    };
  }
  if (settled) return { state: { ...state, entries, changedAt: undefined } };
  state = state.changedAt === undefined ? { ...state, changedAt: now } : state;
  const wakeAt = state.changedAt! + LATE_REVEAL_MS;
  return now >= wakeAt
    ? { state: { ...state, entries, changedAt: undefined } }
    : { state, wakeAt };
}

// Always rebind current selection order/subgroups. Publication must neither
// retain a removed entity nor delay expiry/error truth for visual smoothness.
export function cohortSchedules(
  state: PresentationCohort,
  current: GroupSchedule[],
  week: string,
  now: number,
): GroupSchedule[] {
  const published = new Map(
    state.entries?.map((entry) => [scheduleKey(entry.selection), entry]),
  );
  return current.map((entry) => {
    const old = published.get(scheduleKey(entry.selection));
    const snapshot = usableSnapshot(old?.snapshot, week, now);
    return {
      selection: entry.selection,
      snapshot,
      error:
        entry.error ||
        old?.error ||
        (old?.snapshot && !snapshot
          ? 'Сохранённый снимок слишком старый. Нужны данные источника.'
          : undefined),
      loading: !snapshot && (!!entry.loading || !!entry.snapshot),
      fetching: entry.fetching,
    };
  });
}
