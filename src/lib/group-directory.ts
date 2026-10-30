import type { QueryClient } from '@tanstack/react-query';
import type { Group, Selection } from './types.ts';
import { isGroup } from './schedule-ref.ts';
import { groupOptions } from './queries.ts';
import { parseView, readableGroups } from './url.ts';
import { resolveGroupRequests } from './group-resolution.ts';

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
                  (!g.kind || g.kind === 'group') &&
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

export function rememberGroups(selection: Selection[]) {
  const groups = selection.filter(isGroup);
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
    localStorage.setItem('campus-groups', JSON.stringify(selection));
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
  const groups = await resolveGroupRequests(
    requests,
    knownGroups(),
    async (term) => (await client.fetchQuery(groupOptions(term))).data,
    signal,
    navigator.onLine,
  );
  rememberGroups(groups);
  return { ...parseView(url), groups };
}
