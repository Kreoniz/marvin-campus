import { lessonsFor, lessonKey } from './domain.ts';
import type { GroupSchedule, Lesson, Selection } from './types.ts';

export interface LessonBlock {
  identity: string;
  lesson: Lesson;
  members: Selection[];
  shown: Selection[];
  left: number;
  width: number;
  linked: boolean;
  common: boolean;
  parallel?: Lesson[];
}

// Group lanes stay in selection order. Only adjacent, unoccupied participant
// lanes can merge; a nonparticipant in between always keeps its own space.
export function lessonBlocks(
  schedules: GroupSchedule[],
  date: string,
): LessonBlock[] {
  const events = new Map<
    string,
    { lesson: Lesson; members: Selection[]; parallel?: Lesson[] }
  >();
  const rank = new Map(schedules.map((g, i) => [g.selection.id, i]));
  for (const { selection, snapshot } of schedules) {
    lessonsFor({ selection, snapshot }).forEach((lesson, index) => {
      if (lesson.date !== date || lesson.end <= lesson.start) return;
      const identity = lesson.id
        ? lessonKey(lesson)
        : `unknown:${selection.id}:${index}`;
      const event = events.get(identity);
      if (event) {
        if (!event.members.some((g) => g.id === selection.id))
          event.members.push(selection);
      } else events.set(identity, { lesson, members: [selection] });
    });
  }
  // Bundle only separate events of ONE group with exactly matching intervals.
  // Shared events keep their participants; calculations still use raw lessons.
  const clusters = new Map<string, string[]>();
  for (const [identity, event] of events) {
    if (event.members.length !== 1) continue;
    const key = `${event.members[0].id}:${event.lesson.start}:${event.lesson.end}`;
    clusters.set(key, [...(clusters.get(key) ?? []), identity]);
  }
  for (const keys of clusters.values()) {
    if (keys.length < 2) continue;
    keys.sort();
    const first = events.get(keys[0])!;
    const parallel = keys.map((key) => events.get(key)!.lesson);
    for (const key of keys) events.delete(key);
    events.set(`parallel:${JSON.stringify(keys)}`, { ...first, parallel });
  }
  const slots = new Map<string, { column: number; columns: number }>();
  for (const { selection } of schedules) {
    const own = [...events]
      .filter(([, event]) => event.members.some((g) => g.id === selection.id))
      .sort(
        ([a, x], [b, y]) =>
          x.lesson.start - y.lesson.start ||
          y.lesson.end - x.lesson.end ||
          a.localeCompare(b),
      );
    let cluster: typeof own = [],
      until = -1;
    function finish() {
      const ends: number[] = [];
      const placed = cluster.map(([identity, { lesson }]) => {
        let column = ends.findIndex((end) => end <= lesson.start);
        if (column < 0) column = ends.length;
        ends[column] = lesson.end;
        return { identity, column };
      });
      for (const item of placed)
        slots.set(`${selection.id}:${item.identity}`, {
          column: item.column,
          columns: ends.length,
        });
      cluster = [];
    }
    for (const event of own) {
      if (event[1].lesson.start >= until) {
        finish();
        until = -1;
      }
      cluster.push(event);
      until = Math.max(until, event[1].lesson.end);
    }
    finish();
  }
  const complete = schedules.every((g) => !!g.snapshot);
  return [...events].flatMap(([identity, { lesson, members, parallel }]) => {
    const runs: { shown: Selection[]; left: number; width: number }[] = [];
    for (const group of members
      .slice()
      .sort((a, b) => rank.get(a.id)! - rank.get(b.id)!)) {
      const slot = slots.get(`${group.id}:${identity}`)!;
      const left = rank.get(group.id)! + slot.column / slot.columns,
        width = 1 / slot.columns,
        previous = runs.at(-1);
      if (
        previous &&
        slot.columns === 1 &&
        Math.abs(previous.left + previous.width - left) < 0.001 &&
        previous.width >= 1
      ) {
        previous.shown.push(group);
        previous.width += width;
      } else runs.push({ shown: [group], left, width });
    }
    // Stable chip/stripe order is independent of the order of selected groups.
    const canonical = (groups: Selection[]) =>
      groups.slice().sort((a, b) => a.id - b.id);
    return runs.map((run) => ({
      identity,
      lesson,
      parallel,
      members: canonical(members),
      shown: canonical(run.shown),
      left: run.left / schedules.length,
      width: run.width / schedules.length,
      linked: runs.length > 1 && members.length > 1,
      common:
        complete && schedules.length > 1 && members.length === schedules.length,
    }));
  });
}
