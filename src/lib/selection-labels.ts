import type { GroupSchedule, Selection, VucRef } from './types.ts';
import { compactVucLabel, scheduleKey } from './schedule-ref.ts';
import { selectionLabel } from './subgroups.ts';

function vucCaption(ref: VucRef): string {
  const years = [
    ...new Set(
      ref.sourcePeriod?.match(/\b(?:19|20)\d{2}\b/g) ??
        [ref.firstDate?.slice(0, 4), ref.lastDate?.slice(0, 4)].filter(Boolean),
    ),
  ].sort();
  return `${compactVucLabel(ref.label)}${years.length ? ` · ${years[0]}${years.length > 1 ? `–${years.at(-1)}` : ''}` : ''}`;
}

// Only presentation labels change. Document IDs, order and provenance stay intact.
export function vucOptionLabel(ref: VucRef, peers: VucRef[]): string {
  const caption = vucCaption(ref);
  const matching = peers.filter((other) => vucCaption(other) === caption);
  if (new Set(matching.map((other) => other.id)).size <= 1) return caption;
  const source = (item: VucRef) =>
    item.sourceLabel || item.description || item.sourcePeriod || '';
  const detail = source(ref);
  const unique = matching.every(
    (other) => other.id === ref.id || source(other) !== detail,
  );
  return `${caption} · ${detail}${unique && detail ? '' : `${detail ? ' · ' : ''}${ref.id}`}`;
}

export function selectionLabels(selections: Selection[]) {
  const vuc = selections.filter((ref): ref is VucRef => ref.kind === 'vuc');
  const labels = new Map(
    selections.map((selection) => {
      const base = selectionLabel(selection);
      const collision =
        selection.kind === 'vuc' &&
        vuc.some(
          (other) =>
            other.id !== selection.id && compactVucLabel(other.label) === base,
        );
      return [
        scheduleKey(selection),
        collision ? vucOptionLabel(selection as VucRef, vuc) : base,
      ];
    }),
  );
  return (selection: Selection) =>
    labels.get(scheduleKey(selection)) ?? selectionLabel(selection);
}

export function scheduleLabels(schedules: GroupSchedule[]) {
  return selectionLabels(
    schedules.map(({ selection, snapshot }) =>
      selection.kind === 'vuc'
        ? {
            ...selection,
            sourceLabel:
              selection.sourceLabel ||
              selection.description ||
              snapshot?.data.sourceLabel,
            sourcePeriod: selection.sourcePeriod || snapshot?.data.sourcePeriod,
          }
        : selection,
    ),
  );
}
