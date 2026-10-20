import type { LessonBlock } from './lesson-layout.ts';

export interface GroupLane {
  block: LessonBlock;
  groupId: number;
  left: number;
  width: number;
}

// Project one day's blocks into fixed group slots. Empty groups reserve space;
// shared blocks keep their identity and data in each participant's slot.
export function groupLanes(
  blocks: readonly LessonBlock[],
  groupIds: readonly number[],
): GroupLane[] {
  const ids = [...new Set(groupIds)];
  const result: GroupLane[] = [];
  ids.forEach((groupId, groupColumn) => {
    const ordered = blocks
      .filter((block) => block.members.some((member) => member.id === groupId))
      .sort(
        (a, b) =>
          a.lesson.start - b.lesson.start ||
          b.lesson.end - a.lesson.end ||
          a.identity.localeCompare(b.identity),
      );
    let cluster: { block: LessonBlock; column: number }[] = [];
    let ends: number[] = [];
    let until = -Infinity;

    function finish() {
      for (const { block, column } of cluster)
        result.push({
          block,
          groupId,
          left: (groupColumn + column / ends.length) / ids.length,
          width: 1 / (ids.length * ends.length),
        });
      cluster = [];
      ends = [];
    }

    for (const block of ordered) {
      if (block.lesson.start >= until) {
        finish();
        until = -Infinity;
      }
      let column = ends.findIndex((end) => end <= block.lesson.start);
      if (column < 0) column = ends.length;
      ends[column] = block.lesson.end;
      cluster.push({ block, column });
      until = Math.max(until, block.lesson.end);
    }
    finish();
  });
  return result;
}
