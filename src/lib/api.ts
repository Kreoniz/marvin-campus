import type { Group, Snapshot, Week } from './types.ts';
import type { ViewState } from './url.ts';
import { cachePwaResponse } from './pwa.ts';
import { publicDataTarget, validPublicBody } from './public-cache.js';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, options);
  let body: { error?: string };
  try {
    body = await response.json();
  } catch {
    throw new Error('Сервер вернул непонятный ответ. Попробуйте позже.');
  }
  if (!response.ok)
    throw new Error(body.error || 'Не удалось загрузить данные.');
  const target = publicDataTarget(new URL(path, 'https://campus.example'));
  if (target?.week && !validPublicBody(target, body))
    throw new Error('Сервер вернул некорректное расписание группы.');
  if (!options.method || options.method === 'GET')
    void cachePwaResponse(path, body);
  return body as T;
}

function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  return request<T>(path, { signal });
}

export function readShare(id: string, signal?: AbortSignal) {
  return get<ViewState>(`/api/share/${id}`, signal);
}

export function searchGroups(term: string, signal?: AbortSignal) {
  return get<Snapshot<Group[]>>(
    `/api/groups?term=${encodeURIComponent(term)}`,
    signal,
  );
}

export function loadWeek(
  id: number,
  week: string,
  signal?: AbortSignal,
): Promise<Snapshot<Week>> {
  return get<Snapshot<Week>>(`/api/schedule/${id}?week=${week}`, signal);
}
