import type { Group, Selection } from './types.ts';
import { groupSlug, type GroupRequest } from './url.ts';

// Catalog hits can resolve together; cold source requests remain serialized by
// the API. A small pool avoids turning a long link into a burst of 30 searches.
export async function resolveGroupRequests(
  requests: GroupRequest[],
  known: Group[],
  search: (term: string) => Promise<Group[]>,
  signal: AbortSignal,
  online: boolean,
): Promise<Selection[]> {
  const groups: Selection[] = new Array(requests.length);
  let next = 0;
  let failed = false;
  async function worker() {
    while (next < requests.length && !failed) {
      signal.throwIfAborted();
      const index = next++;
      const request = requests[index];
      try {
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
          if (!online)
            throw new Error(
              'Нет сети. Эта группа ещё не сохранена на устройстве.',
            );
          const matches = (await search(request.label)).filter(
            (g) => groupSlug(g) === request.slug,
          );
          signal.throwIfAborted();
          if (matches.length !== 1)
            throw new Error(
              matches.length
                ? `Код ${request.slug} неоднозначен. Выбери группу через поиск.`
                : `Группа ${request.label} не найдена.`,
            );
          group = matches[0];
        }
        groups[index] = {
          id: group.id,
          label: group.label,
          ...(request.subgroup ? { subgroup: request.subgroup } : {}),
          ...(request.subgroupNumber
            ? { subgroupNumber: request.subgroupNumber }
            : {}),
        };
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(3, requests.length) }, worker),
  );
  signal.throwIfAborted();
  return groups.filter(
    (group, index) => groups.findIndex((g) => g.id === group.id) === index,
  );
}
