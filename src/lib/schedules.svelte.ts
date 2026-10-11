import { onMount } from 'svelte';
import { createQueries } from '@tanstack/svelte-query';
import { scheduleOptions } from './queries.ts';
import { usableSnapshot } from './cache-policy.ts';
import type { GroupSchedule, Selection } from './types.ts';

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
  const schedules = $derived.by((): GroupSchedule[] =>
    selection().map((group) => {
      const query = queries[ids.indexOf(group.id)];
      query?.isStale;
      const snapshot = usableSnapshot(
        query?.data,
        week(),
        Math.max(now, Date.now(), query?.dataUpdatedAt ?? 0),
      );
      return {
        selection: group,
        snapshot,
        error:
          query?.error?.message ||
          (query?.data && !snapshot
            ? 'Сохранённый снимок слишком старый. Нужны данные источника.'
            : undefined),
        loading: query?.isPending ?? false,
      };
    }),
  );
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
      return queries.some((q) => q.isPending);
    },
    get fetching() {
      return queries.some((q) => q.isFetching);
    },
    get revision() {
      return queries.map((q) => [q.dataUpdatedAt, q.errorUpdatedAt]);
    },
  };
}
