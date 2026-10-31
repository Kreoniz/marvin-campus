import { useEffect, useState } from 'react';
import { snapshotChangeAt } from '../../../lib/cache-policy.ts';
import { scheduleKey } from '../../../lib/schedule-ref.ts';
import {
  advanceCohort,
  cohortSchedules,
  type PresentationCohort,
} from '../../../lib/presentation-cohort.ts';
import type { GroupSchedule } from '../../../lib/types.ts';

export default function usePresentationCohort(
  entries: GroupSchedule[],
  week: string,
  enabled: boolean,
) {
  const [clock, setClock] = useState(Date.now);
  const [published, setPublished] = useState<PresentationCohort>();
  const now = Math.max(clock, Date.now());
  const key = `${enabled}:${week}:${JSON.stringify(entries.map((entry) => scheduleKey(entry.selection)).sort())}`;
  const { state, wakeAt } = advanceCohort(
    published,
    key,
    entries,
    now,
    `${enabled}:${week}`,
  );
  useEffect(() => {
    if (state !== published) setPublished(state);
  }, [state, published]);
  const deadlines =
    state.entries?.flatMap((entry) => {
      const at = snapshotChangeAt(entry.snapshot, week, now);
      return at === undefined ? [] : [at];
    }) ?? [];
  if (wakeAt !== undefined) deadlines.push(wakeAt);
  const next = deadlines.length ? Math.min(...deadlines) : undefined;
  useEffect(() => {
    if (next === undefined) return;
    const timer = setTimeout(
      () => setClock(Date.now()),
      Math.min(2_147_483_647, Math.max(1, next - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [next]);
  useEffect(() => {
    const update = () => setClock(Date.now());
    window.addEventListener('focus', update);
    window.addEventListener('online', update);
    return () => {
      window.removeEventListener('focus', update);
      window.removeEventListener('online', update);
    };
  }, []);
  return cohortSchedules(state, entries, week, now);
}
