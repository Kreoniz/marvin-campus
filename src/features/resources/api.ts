import { queryOptions } from '@tanstack/react-query';
import { CACHE_RETENTION, snapshotStaleTime } from '../../lib/cache-policy.ts';
import type {
  ResourceKind,
  ResourceRef,
  ResourceWeek,
  Snapshot,
} from '../../lib/types.ts';

async function load<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError')
      throw error;
    throw new Error(
      navigator.onLine === false
        ? 'Нет сети. Подключись к интернету и повтори загрузку.'
        : 'Не удалось подключиться к серверу. Попробуй позже.',
    );
  }
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error('Сервер вернул непонятный ответ. Попробуй позже.');
  }
  if (!response.ok)
    throw new Error(body.error || 'Не удалось получить расписание.');
  return body as T;
}

export function resourceSearchOptions(kind: ResourceKind, term: string) {
  return queryOptions({
    queryKey: ['resource-search', kind, term] as const,
    queryFn: ({ signal }) =>
      load<Snapshot<ResourceRef[]>>(
        `/api/resources/${kind}?term=${encodeURIComponent(term)}`,
        signal,
      ),
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
    // Resources are not part of the persistent worker store yet. Always make
    // the request so an offline first visit becomes an explicit error.
    networkMode: 'always',
  });
}

export function resourceWeekOptions(resource: ResourceRef, week: string) {
  return queryOptions({
    queryKey: ['resource-week', resource.kind, resource.id, week] as const,
    queryFn: async ({ signal }) => {
      const body = await load<Snapshot<ResourceWeek>>(
        `/api/resources/${resource.kind}/${resource.id}?week=${week}`,
        signal,
      );
      if (
        body.data?.kind !== resource.kind ||
        body.data.id !== resource.id ||
        !Array.isArray(body.data.lessons) ||
        typeof body.stale !== 'boolean' ||
        !Number.isFinite(Date.parse(body.checkedAt)) ||
        !Number.isFinite(Date.parse(body.expiresAt))
      )
        throw new Error('Сервер вернул расписание другого объекта.');
      return body;
    },
    staleTime: (query) =>
      snapshotStaleTime(query.state.data, week, query.state.dataUpdatedAt),
    gcTime: CACHE_RETENTION,
    retry: false,
    networkMode: 'always',
  });
}
