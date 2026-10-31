import type { LessonBlock } from '../../../lib/lesson-layout.ts';
import type { Selection } from '../../../lib/types.ts';
import { scheduleKey } from '../../../lib/schedule-ref.ts';
import { verticalLayout, type VerticalPlacement } from './vertical-layout.ts';

export const SOURCE_INSET = 9;
const LANE_GAP = 6;

// Density follows retained painted lanes, never the number of selections.
export function sourceCardWidth(count: number) {
  return count <= 3 ? 160 : count <= 6 ? 144 : count <= 12 ? 128 : 112;
}
export interface SourceOccurrence extends VerticalPlacement {
  member: Selection;
  left: number;
}
export interface SourceLayout {
  occurrences: SourceOccurrence[];
  columns: number;
  cardWidth: number;
  lanePitch: number;
  width: number;
}

// Only sources owning actual cards reserve a band. Both modes reuse the same
// painted-safe allocator and canonical blocks, including shared membership.
export function sourceLayout(
  blocks: LessonBlock[],
  selections: Selection[],
  origin: number,
  scale: number,
  orderedLanes = true,
): SourceLayout {
  const owners = new Map(
    blocks.map((block) => [
      block.identity,
      selections.find((s) =>
        block.members.some((m) => scheduleKey(m) === scheduleKey(s)),
      ),
    ]),
  );
  const retained = blocks.filter((b) => owners.get(b.identity));
  let placed: VerticalPlacement[];
  if (orderedLanes) {
    let offset = 0;
    placed = selections.flatMap((selection) => {
      const owned = retained.filter(
        (block) => owners.get(block.identity) === selection,
      );
      if (!owned.length) return [];
      const band = verticalLayout(owned, origin, scale, [selection]);
      const columns = Math.max(...band.map((entry) => entry.columns));
      const entries = band.map((entry) => ({
        ...entry,
        column: offset + entry.column,
      }));
      offset += columns;
      return entries;
    });
    // Keep chronological navigation/tab order across the source bands.
    placed.sort((a, b) => a.top - b.top || a.column - b.column);
    placed = placed.map((entry) => ({ ...entry, columns: offset }));
  } else {
    placed = verticalLayout(retained, origin, scale, selections);
  }
  const columns = Math.max(1, ...placed.map((p) => p.columns));
  const cardWidth = sourceCardWidth(columns);
  const lanePitch = cardWidth + LANE_GAP;
  return {
    columns,
    cardWidth,
    lanePitch,
    width: 2 * SOURCE_INSET + columns * cardWidth + (columns - 1) * LANE_GAP,
    occurrences: placed.map((entry) => ({
      ...entry,
      member: owners.get(entry.block.identity)!,
      left: SOURCE_INSET + entry.column * lanePitch,
    })),
  };
}

// Prefer an owned first occurrence, otherwise an actual shared card containing
// the requested member. Hidden choices must be handled by the caller first.
export function sourceJump(layout: SourceLayout, key: string) {
  return (
    layout.occurrences.find((entry) => scheduleKey(entry.member) === key) ??
    layout.occurrences.find((entry) =>
      entry.block.members.some((m) => scheduleKey(m) === key),
    )
  );
}

export function eventAnchor(
  layout: SourceLayout,
  offset: number,
  focusedIdentity?: string,
) {
  const entry =
    layout.occurrences.find(
      (entry) => entry.block.identity === focusedIdentity,
    ) ??
    [...layout.occurrences]
      .sort((a, b) => a.left - b.left || a.top - b.top)
      .find((entry) => entry.left + layout.cardWidth > offset + SOURCE_INSET);
  return (
    entry && {
      identity: entry.block.identity,
      key: scheduleKey(entry.member),
      offset: offset - entry.left,
    }
  );
}

export function restoreEventAnchor(
  anchor: ReturnType<typeof eventAnchor>,
  layout: SourceLayout,
) {
  if (!anchor) return undefined;
  const entry =
    layout.occurrences.find(
      (entry) => entry.block.identity === anchor.identity,
    ) ?? sourceJump(layout, anchor.key);
  return entry
    ? Math.max(
        0,
        entry.left + Math.max(-SOURCE_INSET, Math.min(0, anchor.offset)),
      )
    : 0;
}
