import { validSelection } from './schedule-ref.ts';
import type { GroupSchedule, VucRef } from './types.ts';

export function vucDocumentKey(ref: VucRef): string | undefined {
  return validSelection(ref)
    ? /^d([0-9a-f]{12})-p[0-9]{3}[a-z]?$/.exec(ref.id)?.[1]
    : undefined;
}

// Only a usable catalogue can authorize a download. Persisted selections and
// old week snapshots may describe a document removed from the active input set.
export function vucOriginalAvailable(
  ref: VucRef,
  catalogue: VucRef[],
): boolean {
  return (
    !!vucDocumentKey(ref) &&
    catalogue.find((item) => item.id === ref.id)?.originalAvailable === true
  );
}

export function vucSourceDocuments(
  schedules: GroupSchedule[],
  catalogue: VucRef[],
) {
  const documents = new Map<string, VucRef>();
  for (const { selection } of schedules) {
    if (selection.kind !== 'vuc') continue;
    const key = vucDocumentKey(selection);
    if (!key) continue;
    const previous = documents.get(key);
    if (
      !previous ||
      (!vucOriginalAvailable(previous, catalogue) &&
        vucOriginalAvailable(selection, catalogue))
    )
      documents.set(key, selection);
  }
  return [...documents.values()];
}
