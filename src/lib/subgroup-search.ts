import type { Group, GroupSelection, Subgroup } from './types.ts';
import { publicSubgroup } from './subgroups.ts';

const normalized = (value: string) => value.trim().toUpperCase();

export function subgroupSearchTerm(term: string) {
  const match = /^(.+)-([1-9]\d?)$/.exec(normalized(term));
  return match ? { base: match[1], number: Number(match[2]) } : undefined;
}

// This is an offered choice, never automatic suffix stripping. Both the group
// identity and public subgroup must be established by actual catalogues.
export function subgroupSearch(
  term: string,
  completeResults: Group[],
  baseResults: Group[],
  catalogue: Record<number, Subgroup[]>,
): GroupSelection | undefined {
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
  const group = matches[0];
  const subgroups = (catalogue[group.id] ?? []).filter(
    (entry) => publicSubgroup(entry.label) === request.number,
  );
  if (subgroups.length !== 1) return;
  return {
    ...group,
    subgroup: subgroups[0].id,
    subgroupNumber: request.number,
  };
}
