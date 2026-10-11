import { queryOptions } from '@tanstack/svelte-query';
import { loadWeek, searchGroups } from './api.ts';
import {
  CACHE_RETENTION,
  scheduleKey,
  snapshotStaleTime,
} from './cache-policy.ts';

export function scheduleOptions(id: number, week: string) {
  return queryOptions({
    queryKey: scheduleKey(id, week),
    queryFn: ({ signal }) => loadWeek(id, week, signal),
    staleTime: (query) =>
      snapshotStaleTime(query.state.data, week, query.state.dataUpdatedAt),
    gcTime: CACHE_RETENTION,
    retry: false,
    // The service worker can answer the first fetch while offline. Query's
    // memory cache is not a second persistent offline store.
    networkMode: 'offlineFirst',
  });
}

export function groupOptions(term: string) {
  return queryOptions({
    queryKey: ['groups', term] as const,
    queryFn: ({ signal }) => searchGroups(term, signal),
    staleTime: (query) =>
      query.state.data?.stale
        ? 0
        : Math.max(
            0,
            Date.parse(query.state.data?.expiresAt ?? '') -
              query.state.dataUpdatedAt,
          ) || 0,
    gcTime: CACHE_RETENTION,
    retry: false,
  });
}
