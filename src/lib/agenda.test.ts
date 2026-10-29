import { test } from 'node:test';
import assert from 'node:assert/strict';
import { agendaIntervals, dayAgenda } from './agenda.ts';
import { lessonGroupLabel } from './subgroups.ts';
import { eventMemberLessons, lessonBlocks } from './lesson-layout.ts';
import type { GroupSchedule, Lesson } from './types.ts';
const date = '2026-10-26';
const event = (id: string, extra: Partial<Lesson> = {}): Lesson => ({
  id,
  date,
  start: 480,
  end: 570,
  subject: 'Предмет',
  kind: 'Лекция',
  building: 'Корпус',
  room: '101',
  teacher: '',
  remote: false,
  subgroups: [],
  ...extra,
});
const group = (id: number, lessons: Lesson[]): GroupSchedule => ({
  selection: { id, label: `Г-${id}` },
  snapshot: {
    data: { groupId: id, lessons, subgroups: [] },
    stale: false,
    checkedAt: '',
    expiresAt: '',
  },
});

test('agenda retains shared identity and every distinct simultaneous event', () => {
  const a = group(1, [
    event('shared'),
    event('lab-a', { room: '201', subgroups: [101] }),
    event('lab-b', { room: '202', subgroups: [102] }),
  ]);
  const b = group(2, [event('shared'), event('different-id')]);
  a.snapshot!.data.subgroups = [
    { id: 101, label: 'Г-1/1' },
    { id: 102, label: 'Г-1/2' },
  ];
  const entries = dayAgenda([a, b], date);
  assert.equal(entries.length, 4);
  const shared = entries.filter((e) => e.lesson.id === 'shared');
  assert.equal(shared.length, 1);
  assert.deepEqual(
    shared[0].members.map((m) => m.id),
    [1, 2],
  );
  for (const [id, label, room] of [
    ['lab-a', 'Г-1/1', '201'],
    ['lab-b', 'Г-1/2', '202'],
  ]) {
    const entry = entries.find((e) => e.lesson.id === id)!;
    assert.equal(
      lessonGroupLabel(
        a.selection,
        entry.memberLessons[1],
        a.snapshot!.data.subgroups,
      ),
      label,
    );
    assert.equal(entry.lesson.room, room);
  }
  assert.deepEqual(dayAgenda([b, a], date), entries);
});

test('unknown bundled events retain their own subgroup occurrences in agenda and details', () => {
  const a = group(1, [
    event('', { subgroups: [101] }),
    event('', { subgroups: [102] }),
  ]);
  a.snapshot!.data.subgroups = [
    { id: 101, label: 'Г-1/1' },
    { id: 102, label: 'Г-1/2' },
  ];
  const entries = dayAgenda([a], date);
  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map((e) =>
      lessonGroupLabel(
        a.selection,
        e.memberLessons[1],
        a.snapshot!.data.subgroups,
      ),
    ),
    ['Г-1/1', 'Г-1/2'],
  );
  const block = lessonBlocks([a], date)[0];
  assert.equal(eventMemberLessons(block, 1, block.parallel![0]).length, 1);
  assert.notEqual(entries[0].identity, entries[1].identity);
  assert.equal(dayAgenda([a, group(2, [event('')])], date).length, 3);
});

test('agenda preserves common membership, filtering and partial/saved status without inventing data', () => {
  const a = group(1, [
    event('common'),
    event('first', { subgroups: [101] }),
    event('second', { subgroups: [102] }),
  ]);
  a.selection.subgroup = 102;
  a.snapshot!.stale = true;
  const missing: GroupSchedule = {
    selection: { id: 2, label: 'Г-2' },
    error: 'Нет данных',
  };
  const before = structuredClone([a, missing]);
  const entries = dayAgenda([a, missing], date);
  assert.deepEqual(entries.map((e) => e.lesson.id).sort(), [
    'common',
    'second',
  ]);
  assert.ok(
    entries.every((e) => e.members.length === 1 && e.staleMembers[0] === 1),
  );
  assert.equal(
    lessonGroupLabel(
      a.selection,
      entries.find((e) => e.lesson.id === 'common')!.memberLessons[1],
      [],
    ),
    'Г-1',
  );
  assert.deepEqual([a, missing], before);
  assert.deepEqual(dayAgenda([missing], date), []);
});

test('agenda intervals group equal bounds without merging shared, parallel or unequal endings', () => {
  const a = group(1, [
    event('shared'),
    event('separate', { room: '202' }),
    event('longer', { end: 600 }),
    event('later', { start: 600, end: 690 }),
  ]);
  const b = group(2, [event('shared')]);
  const entries = dayAgenda([a, b], date);
  const before = structuredClone(entries);
  const intervals = agendaIntervals([...entries].reverse());
  assert.deepEqual(
    intervals.map(({ start, end }) => [start, end]),
    [
      [480, 570],
      [480, 600],
      [600, 690],
    ],
  );
  assert.equal(intervals[0].entries.length, 2);
  assert.equal(
    intervals[0].entries.find((entry) => entry.lesson.id === 'shared')!.members
      .length,
    2,
  );
  assert.equal(
    intervals.flatMap((interval) => interval.entries).length,
    entries.length,
  );
  assert.deepEqual(entries, before);
  assert.deepEqual(agendaIntervals([]), []);
});
