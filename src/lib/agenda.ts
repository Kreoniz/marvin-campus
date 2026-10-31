import { eventMemberLessons, lessonBlocks } from './lesson-layout.ts';
import type { LessonBlock } from './lesson-layout.ts';
import type { GroupSchedule } from './types.ts';
import { scheduleKey } from './schedule-ref.ts';

export type AgendaEntry = Pick<
  LessonBlock,
  'identity' | 'lesson' | 'members' | 'memberLessons' | 'staleMembers'
>;

export function dayAgenda(
  schedules: GroupSchedule[],
  date: string,
): AgendaEntry[] {
  return lessonBlocks(schedules, date).flatMap((block) =>
    (block.parallel ?? [block.lesson]).map((lesson, index) => ({
      identity: `${block.identity}:${index}`,
      lesson,
      members: block.members,
      memberLessons: Object.fromEntries(
        block.members.map((member) => [
          scheduleKey(member),
          eventMemberLessons(block, scheduleKey(member), lesson),
        ]),
      ),
      staleMembers: block.staleMembers,
    })),
  );
}

// Group presentation only: equal starts with different ends remain separate.
export function agendaIntervals(entries: AgendaEntry[]): {
  start: number;
  end: number;
  entries: AgendaEntry[];
}[] {
  const intervals = new Map<
    string,
    { start: number; end: number; entries: AgendaEntry[] }
  >();
  for (const entry of entries) {
    const { start, end } = entry.lesson;
    const key = `${start}:${end}`;
    const interval = intervals.get(key);
    if (interval) interval.entries.push(entry);
    else intervals.set(key, { start, end, entries: [entry] });
  }
  return [...intervals.values()].sort(
    (a, b) => a.start - b.start || a.end - b.end,
  );
}
