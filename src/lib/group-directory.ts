import type { QueryClient } from '@tanstack/svelte-query';
import type { Group, Selection } from './types.ts';
import { groupOptions } from './queries.ts';
import { groupSlug, parseView, readableGroups } from './url.ts';

export function knownGroups(): Group[] {
  try {
    const groups = ['campus-group-directory', 'campus-groups'].flatMap(
      (key) => {
        const value = JSON.parse(localStorage.getItem(key) ?? '[]');
        return Array.isArray(value)
          ? value
              .slice(0, 200)
              .filter(
                (g) =>
                  g &&
                  Number.isSafeInteger(g.id) &&
                  g.id > 0 &&
                  g.id <= 10000000 &&
                  typeof g.label === 'string' &&
                  g.label.length > 0 &&
                  g.label.length <= 80,
              )
          : [];
      },
    );
    return [...new Map(groups.map((g: Group) => [g.id, g])).values()];
  } catch {
    return [];
  }
}

export function rememberGroups(groups: Group[]) {
  try {
    const directory = new Map(
      knownGroups().map((g) => [g.id, { id: g.id, label: g.label }]),
    );
    for (const { id, label } of groups) {
      directory.delete(id);
      directory.set(id, { id, label });
    }
    localStorage.setItem(
      'campus-group-directory',
      JSON.stringify([...directory.values()].slice(-200)),
    );
    localStorage.setItem('campus-groups', JSON.stringify(groups));
  } catch {}
}

// Only directory lookup uses the existing API; the comparison itself is wholly
// encoded in the URL. Known groups also allow an offline PWA restart.
export async function resolveReadable(
  url: URL,
  client: QueryClient,
  signal: AbortSignal,
) {
  const requests = readableGroups(url);
  if (!requests?.length) throw new Error('Некорректная ссылка на сравнение.');
  const known = knownGroups();
  const groups: Selection[] = [];
  for (const request of requests) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    const local = known.filter((g) => groupSlug(g) === request.slug);
    if (!request.id && local.length > 1)
      throw new Error(
        `Код ${request.slug} неоднозначен. Выбери группу через поиск.`,
      );
    let group = request.id
      ? (known.find((g) => g.id === request.id) ?? {
          id: request.id,
          label: request.label,
        })
      : local[0];
    if (!group) {
      if (!navigator.onLine)
        throw new Error('Нет сети. Эта группа ещё не сохранена на устройстве.');
      const matches = (
        await client.fetchQuery(groupOptions(request.label))
      ).data.filter((g) => groupSlug(g) === request.slug);
      if (matches.length !== 1)
        throw new Error(
          matches.length
            ? `Код ${request.slug} неоднозначен. Выбери группу через поиск.`
            : `Группа ${request.label} не найдена.`,
        );
      group = matches[0];
    }
    if (!groups.some((g) => g.id === group.id))
      groups.push({
        id: group.id,
        label: group.label,
        ...(request.subgroup ? { subgroup: request.subgroup } : {}),
        ...(request.subgroupNumber
          ? { subgroupNumber: request.subgroupNumber }
          : {}),
      });
  }
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  rememberGroups(groups);
  return { ...parseView(url), groups };
}
