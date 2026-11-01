import { queryOptions } from '@tanstack/react-query';
import { CACHE_RETENTION, snapshotStaleTime } from '../../lib/cache-policy.ts';
import { cachePwaResponse } from '../../lib/pwa.ts';
import {
  publicDataTarget,
  readPublicResponse,
  validPublicBody,
  publicBodyUsable,
  PUBLIC_DATA_CACHE,
} from '../../lib/public-cache.js';
import { savedSchedulePath } from '../../lib/saved-schedules.ts';
import { validSelection } from '../../lib/schedule-ref.ts';
import type {
  ResourceKind,
  ResourceRef,
  ResourceWeek,
  Snapshot,
  VucRef,
  VucWeek,
} from '../../lib/types.ts';

async function load<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { signal });
  } catch (error) {
    if (
      signal?.aborted ||
      (error instanceof DOMException && error.name === 'AbortError')
    )
      throw error;
    if (path === '/api/vuc?term=') {
      try {
        const target = publicDataTarget(
          new URL(path, 'https://campus.example'),
        )!;
        const saved = await readPublicResponse(
          await (await globalThis.caches?.open(PUBLIC_DATA_CACHE))?.match(path),
        );
        if (publicBodyUsable(target, saved))
          return { ...(saved as object), stale: true } as T;
      } catch {}
    }
    throw new Error(
      globalThis.navigator?.onLine === false
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
function searchOptions<T>(
  key: string[],
  path: string,
  validItem: (value: T) => boolean,
) {
  return queryOptions({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const body = await load<Snapshot<T[]>>(path, signal);
      if (
        !validTimes(body) ||
        !Array.isArray(body?.data) ||
        body.data.some((item) => !validItem(item))
      )
        throw new Error('Сервер вернул некорректные результаты поиска.');
      if (path === '/api/vuc?term=') {
        if (
          !validPublicBody(
            publicDataTarget(new URL(path, 'https://campus.example')),
            body,
          )
        )
          throw new Error('Сервер вернул некорректный каталог ВУЦ.');
        void cachePwaResponse(path, body);
      }
      return body;
    },
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
    networkMode: 'always',
  });
}
export function resourceSearchOptions(kind: ResourceKind, term: string) {
  return searchOptions<ResourceRef>(
    ['resource-search', kind, term],
    `/api/resources/${kind}?term=${encodeURIComponent(term)}`,
    (ref) => validSelection(ref) && ref.kind === kind,
  );
}
export function vucSearchOptions(term: string) {
  return searchOptions<VucRef>(
    ['vuc-search', term],
    `/api/vuc?term=${encodeURIComponent(term)}`,
    (ref) =>
      validSelection(ref) &&
      ref.kind === 'vuc' &&
      (ref.originalAvailable === undefined ||
        typeof ref.originalAvailable === 'boolean'),
  );
}
function validTimes(body: Snapshot<unknown>) {
  return (
    !!body &&
    typeof body.stale === 'boolean' &&
    typeof body.checkedAt === 'string' &&
    Number.isFinite(Date.parse(body.checkedAt)) &&
    typeof body.expiresAt === 'string' &&
    Number.isFinite(Date.parse(body.expiresAt))
  );
}
export async function loadResourceWeek(
  resource: ResourceRef,
  week: string,
  signal?: AbortSignal,
) {
  const body = await load<Snapshot<ResourceWeek>>(
    `/api/resources/${resource.kind}/${resource.id}?week=${week}`,
    signal,
  );
  const path = savedSchedulePath(resource, week);
  if (
    !validPublicBody(
      publicDataTarget(new URL(path, 'https://campus.example')),
      body,
    )
  )
    throw new Error('Сервер вернул расписание другого объекта.');
  void cachePwaResponse(path, body);
  return body;
}
export async function loadVucWeek(
  resource: VucRef,
  week: string,
  signal?: AbortSignal,
) {
  const body = await load<Snapshot<VucWeek>>(
    `/api/vuc/${encodeURIComponent(resource.id)}?week=${week}`,
    signal,
  );
  const path = savedSchedulePath(resource, week);
  if (
    !validPublicBody(
      publicDataTarget(new URL(path, 'https://campus.example')),
      body,
    )
  )
    throw new Error('Сервер вернул некорректное расписание ВУЦ.');
  void cachePwaResponse(path, body);
  return body;
}
export function resourceWeekOptions(resource: ResourceRef, week: string) {
  return queryOptions({
    queryKey: ['resource-week', resource.kind, resource.id, week] as const,
    queryFn: ({ signal }) => loadResourceWeek(resource, week, signal),
    staleTime: (query) =>
      snapshotStaleTime(query.state.data, week, query.state.dataUpdatedAt),
    gcTime: CACHE_RETENTION,
    retry: false,
    networkMode: 'always',
  });
}
export function vucWeekOptions(resource: VucRef, week: string) {
  return queryOptions({
    queryKey: ['vuc-week', resource.id, week] as const,
    queryFn: ({ signal }) => loadVucWeek(resource, week, signal),
    staleTime: (query) =>
      snapshotStaleTime(query.state.data, week, query.state.dataUpdatedAt),
    gcTime: CACHE_RETENTION,
    retry: false,
    networkMode: 'always',
  });
}
