import { onMount, untrack } from 'svelte';
import { createQueries } from '@tanstack/svelte-query';
import { scheduleOptions } from './queries.ts';
import { snapshotChangeAt, usableSnapshot } from './cache-policy.ts';
import { readSavedSchedule } from './saved-schedules.ts';
import type { GroupSchedule, Selection, Snapshot, Week } from './types.ts';

export function createSchedules(
  selection: () => Selection[],
  week: () => string,
  enabled: () => boolean,
) {
  let now = $state(Date.now());
  // A primitive ID key prevents subgroup/order changes from recreating the
  // observers. Those changes only reselect the cached full-week response.
  const idKey = $derived(
    enabled()
      ? selection()
          .map((g) => g.id)
          .sort((a, b) => a - b)
          .join(',')
      : '',
  );
  const ids = $derived(idKey ? idKey.split(',').map(Number) : []);
  const queries = createQueries(() => ({
    queries: ids.map((id) => scheduleOptions(id, week())),
  }));
  let saved = $state<{
    week: string;
    snapshots: Record<number, Snapshot<Week>>;
  }>({
    week: '',
    snapshots: {},
  });
  $effect(() => {
    const selectedWeek = week(),
      selectedIds = ids;
    let cancelled = false;
    untrack(() => {
      saved = {
        week: selectedWeek,
        snapshots: Object.fromEntries(
          selectedIds.flatMap((id) =>
            saved.week === selectedWeek && saved.snapshots[id]
              ? [[id, saved.snapshots[id]]]
              : [],
          ),
        ),
      };
      selectedIds.forEach((id, index) => {
        if (queries[index]?.data || saved.snapshots[id]) return;
        void readSavedSchedule(id, selectedWeek).then((snapshot) => {
          if (cancelled || !snapshot) return;
          saved = {
            week: selectedWeek,
            snapshots: { ...saved.snapshots, [id]: snapshot },
          };
        });
      });
    });
    return () => {
      cancelled = true;
    };
  });
  const schedules = $derived.by((): GroupSchedule[] =>
    selection().map((group) => {
      const query = queries[ids.indexOf(group.id)];
      query?.isStale;
      // Network data wins even if a slower CacheStorage read completes later.
      // Keep refresh errors on the query; restoring a snapshot must not clear them.
      const data =
        query?.data ??
        (saved.week === week() ? saved.snapshots[group.id] : undefined);
      const snapshot = usableSnapshot(
        data,
        week(),
        Math.max(now, Date.now(), query?.dataUpdatedAt ?? 0),
      );
      return {
        selection: group,
        snapshot,
        error:
          query?.error?.message ||
          (data && !snapshot
            ? 'Сохранённый снимок слишком старый. Нужны данные источника.'
            : undefined),
        loading: !snapshot && (query?.isPending ?? false),
      };
    }),
  );
  $effect(() => {
    const selectedWeek = week();
    const clock = now;
    const changes = ids.flatMap((id, index) => {
      const data =
        queries[index]?.data ??
        (saved.week === selectedWeek ? saved.snapshots[id] : undefined);
      const change = snapshotChangeAt(data, selectedWeek, clock);
      return change === undefined ? [] : [change];
    });
    if (!changes.length) return;
    const timer = setTimeout(
      () => {
        now = Date.now();
      },
      Math.max(1, Math.min(...changes) - Date.now()),
    );
    return () => clearTimeout(timer);
  });
  onMount(() => {
    const updateClock = () => {
      now = Date.now();
    };
    window.addEventListener('focus', updateClock);
    window.addEventListener('online', updateClock);
    return () => {
      window.removeEventListener('focus', updateClock);
      window.removeEventListener('online', updateClock);
    };
  });
  return {
    get schedules() {
      return schedules;
    },
    get pending() {
      return schedules.some((group) => group.loading);
    },
    get fetching() {
      return queries.some((q) => q.isFetching);
    },
    get revision() {
      return queries.map((q) => [q.dataUpdatedAt, q.errorUpdatedAt]);
    },
  };
}
