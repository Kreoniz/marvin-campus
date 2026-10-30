import { queryOptions } from '@tanstack/react-query';
import { CACHE_RETENTION, snapshotStaleTime } from '../../lib/cache-policy.ts';
import { addDays, validDate } from '../../lib/dates.ts';
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
    (ref) => validSelection(ref) && ref.kind === 'vuc',
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
function validWeek(body: Snapshot<ResourceWeek | VucWeek>, week: string) {
  return (
    Array.isArray(body?.data?.lessons) &&
    body.data.lessons.every(
      (lesson) =>
        typeof lesson.id === 'string' &&
        typeof lesson.subject === 'string' &&
        typeof lesson.teacher === 'string' &&
        typeof lesson.room === 'string' &&
        typeof lesson.kind === 'string' &&
        typeof lesson.building === 'string' &&
        typeof lesson.remote === 'boolean' &&
        typeof lesson.date === 'string' &&
        validDate(lesson.date) &&
        lesson.date >= week &&
        lesson.date <= addDays(week, 6) &&
        Number.isInteger(lesson.start) &&
        Number.isInteger(lesson.end) &&
        lesson.start >= 0 &&
        lesson.end <= 1440 &&
        lesson.start < lesson.end &&
        Array.isArray(lesson.subgroups),
    ) &&
    validTimes(body)
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
  if (
    body?.data?.kind !== resource.kind ||
    body.data.id !== resource.id ||
    !validWeek(body, week)
  )
    throw new Error('Сервер вернул расписание другого объекта.');
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
  if (
    body?.data?.kind !== 'vuc' ||
    body.data.id !== resource.id ||
    !validWeek(body, week) ||
    !Array.isArray(body.data.coveredDates) ||
    body.data.coveredDates.some(
      (date) => !validDate(date) || date < week || date > addDays(week, 6),
    ) ||
    body.data.unresolvedDates?.some(
      (date) => !validDate(date) || date < week || date > addDays(week, 6),
    )
  )
    throw new Error('Сервер вернул некорректное расписание ВУЦ.');
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
