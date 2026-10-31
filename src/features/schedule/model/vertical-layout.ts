import type { LessonBlock } from '../../../lib/lesson-layout.ts';
import { scheduleKey } from '../../../lib/schedule-ref.ts';
import type { Selection } from '../../../lib/types.ts';
import { eventOwner } from './event-owner.ts';

export const VERTICAL_CARD_WIDTH = 160;
export const VERTICAL_LANE_PITCH = 166;
// Five-pixel presence bracket + one clear pixel + three-pixel card outline.
export const VERTICAL_DAY_INSET = 9;

export interface VerticalPlacement {
  block: LessonBlock;
  top: number;
  height: number;
  column: number;
  columns: number;
}

// Presentation geometry only: painted minimum heights must not change the
// lesson times used by presence/free calculations or the horizontal timeline.
export function verticalLayout(
  blocks: LessonBlock[],
  origin: number,
  scale: number,
  selections?: Selection[],
): VerticalPlacement[] {
  const priority = new Map(
    selections?.map((s, index) => [scheduleKey(s), index]),
  );
  const ownerKey = (block: LessonBlock) => {
    const owner = selections
      ? selections.find((s) =>
          block.members.some((m) => scheduleKey(m) === scheduleKey(s)),
        )
      : eventOwner(block.members);
    return owner ? scheduleKey(owner) : '';
  };
  const ordered = blocks.map((block) => {
    const top = (block.lesson.start - origin) * scale;
    const height = Math.max(
      (block.lesson.end - block.lesson.start) * scale - 3,
      18,
    );
    return {
      block,
      top,
      height,
      reserveEnd: Math.max((block.lesson.end - origin) * scale, top + height),
    };
  });
  if (selections)
    ordered.sort(
      (a, b) =>
        a.top - b.top ||
        (priority.get(ownerKey(a.block)) ?? Infinity) -
          (priority.get(ownerKey(b.block)) ?? Infinity) ||
        b.reserveEnd - a.reserveEnd ||
        a.block.identity.localeCompare(b.block.identity),
    );
  const result: VerticalPlacement[] = [];
  const lastLane = new Map<string, number>();
  let cluster: typeof ordered = [];
  let until = -Infinity;
  function finish() {
    const ends: number[] = [];
    const placed = cluster.map((entry) => {
      const key = ownerKey(entry.block);
      const preferred = lastLane.get(key);
      const occupiedEdge = ends.reduce(
        (edge, end, index) => (end > entry.top ? index : edge),
        -1,
      );
      // Keep affinity inside the occupied span only. An old right-hand lane
      // must not leave a hole after its left-hand neighbor has finished.
      let column =
        preferred !== undefined &&
        preferred <= occupiedEdge &&
        ends[preferred] <= entry.top
          ? preferred
          : ends.findIndex((end) => end <= entry.top);
      if (column < 0) column = ends.length;
      ends[column] = entry.reserveEnd;
      lastLane.set(key, column);
      return { ...entry, column };
    });
    for (const entry of placed) {
      result.push({
        block: entry.block,
        top: entry.top,
        height: entry.height,
        column: entry.column,
        columns: ends.length,
      });
    }
    cluster = [];
  }
  for (const entry of ordered) {
    if (entry.top >= until) {
      finish();
      until = -Infinity;
    }
    cluster.push(entry);
    until = Math.max(until, entry.reserveEnd);
  }
  finish();
  return result;
}

export function dayMinimum(placed: VerticalPlacement[], compactFloor = 0) {
  return Math.max(
    VERTICAL_LANE_PITCH + VERTICAL_DAY_INSET - 2,
    compactFloor,
    ...placed.map(
      (entry) => VERTICAL_LANE_PITCH * entry.columns + VERTICAL_DAY_INSET - 2,
    ),
  );
}
