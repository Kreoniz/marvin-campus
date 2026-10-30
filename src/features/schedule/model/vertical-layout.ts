import type { LessonBlock } from '../../../lib/lesson-layout.ts';

export const VERTICAL_CARD_WIDTH = 160;
export const VERTICAL_LANE_PITCH = 166;

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
): VerticalPlacement[] {
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
  const result: VerticalPlacement[] = [];
  let cluster: typeof ordered = [];
  let until = -Infinity;
  function finish() {
    const ends: number[] = [];
    const placed = cluster.map((entry) => {
      let column = ends.findIndex((end) => end <= entry.top);
      if (column < 0) column = ends.length;
      ends[column] = entry.reserveEnd;
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
    VERTICAL_LANE_PITCH,
    compactFloor,
    ...placed.map((entry) => VERTICAL_LANE_PITCH * entry.columns),
  );
}
