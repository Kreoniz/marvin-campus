import { comparisonIssue, lessonsFor, lessonKey } from './domain.ts';
import type { GroupSchedule, Lesson, Selection } from './types.ts';
import { compareScheduleRefs, scheduleKey } from './schedule-ref.ts';

export interface LessonBlock {
  identity: string;
  lesson: Lesson;
  members: Selection[];
  // Subgroup IDs belong to each participant's source response.
  memberLessons: Record<string, Lesson[]>;
  staleMembers: string[];
  column: number;
  columns: number;
  left: number;
  width: number;
  common: boolean;
  parallel?: Lesson[];
}

// Unknown source IDs are separate occurrences, even when all visible fields
// match. Keep their retained references when looking up a bundle constituent.
export function eventMemberLessons(
  block: LessonBlock,
  memberId: string,
  event?: Lesson,
): Lesson[] {
  const own = block.memberLessons[memberId] ?? [];
  if (!event) return own;
  return own.filter((source) =>
    event.id ? lessonKey(source) === lessonKey(event) : source === event,
  );
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
        : `unknown:${scheduleKey(selection)}:${index}`;
      const event = events.get(identity);
      if (event) {
        if (
          !event.members.some((g) => scheduleKey(g) === scheduleKey(selection))
        )
          event.members.push(selection);
        (event.memberLessons[scheduleKey(selection)] ??= []).push(lesson);
        if (
          (snapshot?.stale || error) &&
          !event.staleMembers.includes(scheduleKey(selection))
        )
          event.staleMembers.push(scheduleKey(selection));
      } else
        events.set(identity, {
          lesson,
          members: [selection],
          memberLessons: { [scheduleKey(selection)]: [lesson] },
          staleMembers:
            snapshot?.stale || error ? [scheduleKey(selection)] : [],
        });
    });
  }
  // Bundle only separate events of ONE group with exactly matching intervals.
  // Shared events keep their participants; calculations still use raw lessons.
  const clusters = new Map<string, string[]>();
  for (const [identity, event] of events) {
    if (event.members.length !== 1) continue;
    const key = `${scheduleKey(event.members[0])}:${event.lesson.start}:${event.lesson.end}`;
    clusters.set(key, [...(clusters.get(key) ?? []), identity]);
  }
  for (const keys of clusters.values()) {
    if (keys.length < 2) continue;
    keys.sort();
    const first = events.get(keys[0])!;
    const bundled = keys.map((key) => events.get(key)!);
    const parallel = bundled.map((event) => event.lesson);
    const member = scheduleKey(first.members[0]);
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
  const complete = schedules.every((g) => !comparisonIssue(g, date));
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
      const sortedMembers = members.slice().sort(compareScheduleRefs);
      blocks.push({
        identity,
        lesson: displayLesson(
          sortedMembers.flatMap((member) => memberLessons[scheduleKey(member)]),
        ),
        parallel,
        members: sortedMembers,
        memberLessons,
        staleMembers: sortedMembers
          .map(scheduleKey)
          .filter((key) => staleMembers.includes(key)),
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

// Only occurrences already proven to be the same source event reach this
// projection. Retained memberLessons still expose every original source record.
function displayLesson(lessons: Lesson[]): Lesson {
  const first = lessons[0];
  if (!first) throw new Error('A lesson block must retain an occurrence.');
  if (!first.id) return first;
  const teachers = [
    ...new Map(
      lessons
        .flatMap((lesson) => lesson.teachers ?? [])
        .map((ref) => [scheduleKey(ref), ref]),
    ).values(),
  ];
  const rooms = [
    ...new Map(
      lessons
        .flatMap((lesson) => (lesson.roomRef ? [lesson.roomRef] : []))
        .map((ref) => [scheduleKey(ref), ref]),
    ).values(),
  ];
  const audiences = [
    ...new Set(
      lessons.flatMap((lesson) => (lesson.audience ? [lesson.audience] : [])),
    ),
  ];
  const warnings = [
    ...new Set(lessons.flatMap((lesson) => lesson.metadataWarnings ?? [])),
  ];
  if (rooms.length > 1)
    warnings.push('В источниках различаются идентификаторы аудитории.');
  const teacherText = [
    ...new Set(
      lessons.flatMap((lesson) => (lesson.teacher ? [lesson.teacher] : [])),
    ),
  ];
  if (teacherText.length > 1)
    warnings.push('В исходных расписаниях различаются подписи преподавателей.');
  return {
    ...first,
    teacher: first.teacher || teacherText[0] || '',
    teachers: teachers.length ? teachers : first.teachers,
    roomRef:
      rooms.length === 1
        ? rooms[0]
        : rooms.length > 1
          ? undefined
          : first.roomRef,
    audience: first.audience || audiences[0],
    audiences: audiences.length > 1 ? audiences : first.audiences,
    metadataWarnings: warnings.length ? warnings : undefined,
  };
}
