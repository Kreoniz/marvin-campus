import { comparisonIssue, lessonsFor, lessonKey } from './domain.ts';
import type { GroupSchedule, Lesson, Selection } from './types.ts';

export interface LessonBlock {
  identity: string;
  lesson: Lesson;
  members: Selection[];
  // Subgroup IDs belong to each participant's source response.
  memberLessons: Record<number, Lesson[]>;
  staleMembers: number[];
  column: number;
  columns: number;
  left: number;
  width: number;
  common: boolean;
  parallel?: Lesson[];
}

// Lanes belong to overlapping events, not groups. A shared event is rendered
// once, and groups without lessons never reserve space.
export function lessonBlocks(
  schedules: GroupSchedule[],
  date: string,
): LessonBlock[] {
  const events = new Map<
    string,
    Pick<
      LessonBlock,
      'lesson' | 'members' | 'memberLessons' | 'staleMembers' | 'parallel'
    >
  >();
  for (const { selection, snapshot, error } of schedules) {
    lessonsFor({ selection, snapshot }).forEach((lesson, index) => {
      if (lesson.date !== date || lesson.end <= lesson.start) return;
      const identity = lesson.id
        ? lessonKey(lesson)
        : `unknown:${selection.id}:${index}`;
      const event = events.get(identity);
      if (event) {
        if (!event.members.some((g) => g.id === selection.id))
          event.members.push(selection);
        (event.memberLessons[selection.id] ??= []).push(lesson);
        if (
          (snapshot?.stale || error) &&
          !event.staleMembers.includes(selection.id)
        )
          event.staleMembers.push(selection.id);
      } else
        events.set(identity, {
          lesson,
          members: [selection],
          memberLessons: { [selection.id]: [lesson] },
          staleMembers: snapshot?.stale || error ? [selection.id] : [],
        });
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
    const bundled = keys.map((key) => events.get(key)!);
    const parallel = bundled.map((event) => event.lesson);
    const member = first.members[0].id;
    for (const key of keys) events.delete(key);
    events.set(`parallel:${JSON.stringify(keys)}`, {
      ...first,
      parallel,
      memberLessons: {
        [member]: bundled.flatMap((event) => event.memberLessons[member]),
      },
      staleMembers: [
        ...new Set(bundled.flatMap((event) => event.staleMembers)),
      ],
    });
  }
  const ordered = [...events].sort(
    ([a, x], [b, y]) =>
      x.lesson.start - y.lesson.start ||
      y.lesson.end - x.lesson.end ||
      a.localeCompare(b),
  );
  const complete = schedules.every((g) => !comparisonIssue(g));
  const blocks: LessonBlock[] = [];
  let cluster: typeof ordered = [],
    until = -1;
  function finish() {
    const ends: number[] = [];
    const placed = cluster.map(([identity, event]) => {
      let column = ends.findIndex((end) => end <= event.lesson.start);
      if (column < 0) column = ends.length;
      ends[column] = event.lesson.end;
      return { identity, ...event, column };
    });
    for (const {
      identity,
      members,
      memberLessons,
      staleMembers,
      parallel,
      column,
    } of placed) {
      const sortedMembers = members.slice().sort((a, b) => a.id - b.id);
      blocks.push({
        identity,
        lesson: memberLessons[sortedMembers[0].id][0],
        parallel,
        members: sortedMembers,
        memberLessons,
        staleMembers: staleMembers.slice().sort((a, b) => a - b),
        column,
        columns: ends.length,
        left: column / ends.length,
        width: 1 / ends.length,
        common:
          complete &&
          schedules.length > 1 &&
          members.length === schedules.length,
      });
    }
    cluster = [];
  }
  for (const event of ordered) {
    if (event[1].lesson.start >= until) {
      finish();
      until = -1;
    }
    cluster.push(event);
    until = Math.max(until, event[1].lesson.end);
  }
  finish();
  return blocks;
}
