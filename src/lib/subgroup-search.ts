import type { Group, GroupSelection, Snapshot, Week } from './types.ts';
import { publicSubgroup } from './subgroups.ts';
import { usableSnapshot } from './cache-policy.ts';

const normalized = (value: string) => value.trim().toUpperCase();

export function subgroupSearchTerm(term: string) {
  const match = /^(.+)-([1-9]\d?)$/.exec(normalized(term));
  return match ? { base: match[1], number: Number(match[2]) } : undefined;
}

export function subgroupSearchBase(
  term: string,
  completeResults: Group[],
  baseResults: Group[],
): Group | undefined {
  const full = normalized(term);
  if (
    [...completeResults, ...baseResults].some(
      (group) => normalized(group.label) === full,
    )
  )
    return;
  const request = subgroupSearchTerm(term);
  if (!request) return;
  const matches = [
    ...new Map(
      baseResults
        .filter((group) => normalized(group.label) === request.base)
        .map((group) => [group.id, group]),
    ).values(),
  ];
  if (matches.length !== 1) return;
  return matches[0];
}

// This is an offered choice, never automatic suffix stripping. Both the group
// identity and public subgroup must be established by actual catalogues.
export function subgroupSearch(
  term: string,
  completeResults: Group[],
  baseResults: Group[],
  snapshot: Snapshot<Week> | undefined,
  week: string,
  now: number,
): GroupSelection | undefined {
  const group = subgroupSearchBase(term, completeResults, baseResults);
  const request = subgroupSearchTerm(term);
  if (!group || !request) return;
  const verified = usableSnapshot(snapshot, week, now);
  if (!verified || verified.stale || verified.data.groupId !== group.id) return;
  const subgroups = verified.data.subgroups.filter(
    (entry) => publicSubgroup(entry.label) === request.number,
  );
  if (subgroups.length !== 1) return;
  return {
    ...group,
    subgroup: subgroups[0].id,
    subgroupNumber: request.number,
  };
}
