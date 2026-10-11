import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonBlocks } from './lesson-layout.ts';
import { lessonKind } from './lesson-kind.ts';
import type { GroupSchedule, Lesson } from './types.ts';
const date = '2026-10-12';
const lesson = (id: string, fields: Partial<Lesson> = {}): Lesson => ({
  id,
  date,
  start: 480,
  end: 565,
  subject: 'Общая лекция',
  kind: 'Лекция',
  building: 'УЛК-1',
  room: '101',
  teacher: '',
  remote: false,
  subgroups: [],
  ...fields,
});
const group = (
  id: number,
  lessons: Lesson[],
  subgroup?: number,
): GroupSchedule => ({
  selection: { id, label: `Г-${id}`, subgroup },
  snapshot: {
    data: { groupId: id, lessons, subgroups: [] },
    checkedAt: '',
    expiresAt: '',
    stale: false,
  },
});
test('shared events render once beside other events, independently of selection order', () => {
  const a = group(1, [lesson('shared')]),
    b = group(2, [lesson('solo')]),
    c = group(3, [lesson('shared')]);
  const mixed = lessonBlocks([a, b, c], date);
  const shared = mixed.filter((b) => b.members.length === 2);
  assert.equal(shared.length, 1);
  assert.equal(shared[0].width, 0.5);
  assert.equal(shared[0].common, false);
  assert.equal(new Set(mixed.map((b) => b.column)).size, 2);
  for (const selections of [
    [c, a, b],
    [b, c, a],
    [c, b, a],
  ])
    assert.deepEqual(lessonBlocks(selections, date), mixed);
  assert.deepEqual(
    shared[0].members.map((g) => g.id),
    [1, 3],
  );
});
test('a concurrent shared lesson and subgroup bundle use separate event lanes', () => {
  const blocks = lessonBlocks(
    [
      group(1, [
        lesson('stream'),
        lesson('lab1', { subgroups: [1] }),
        lesson('lab2', { subgroups: [2] }),
      ]),
      group(2, [lesson('stream')]),
    ],
    date,
  );
  assert.equal(blocks.length, 2);
  assert.equal(new Set(blocks.map((b) => b.column)).size, 2);
  assert.ok(blocks.every((b) => b.width === 0.5));
  const stream = blocks.filter((b) => b.lesson.id === 'stream');
  assert.equal(stream.length, 1);
  const filtered = lessonBlocks(
    [
      group(
        1,
        [
          lesson('stream'),
          lesson('lab1', { subgroups: [1] }),
          lesson('lab2', { subgroups: [2] }),
        ],
        1,
      ),
    ],
    date,
  );
  assert.deepEqual(
    filtered.flatMap((b) => (b.parallel ?? [b.lesson]).map((l) => l.id)).sort(),
    ['lab1', 'stream'],
  );
});
test('matching text, missing IDs or different occurrences never establish a shared lesson', () => {
  for (const other of [
    lesson('different'),
    lesson('same', { room: '102' }),
    lesson('same', { remote: true }),
  ]) {
    const blocks = lessonBlocks(
      [group(1, [lesson('same')]), group(2, [other])],
      date,
    );
    assert.ok(blocks.every((b) => b.members.length === 1));
  }
  assert.equal(
    lessonBlocks([group(1, [lesson('')]), group(2, [lesson('')])], date).length,
    2,
  );
  const partial = lessonBlocks(
    [
      group(1, [lesson('same')]),
      group(2, [lesson('same')]),
      { selection: { id: 3, label: 'Г-3' }, error: 'Нет данных' },
    ],
    date,
  );
  assert.equal(partial[0].members.length, 2);
  assert.equal(partial[0].common, false);
  assert.equal(partial[0].width, 1);
  assert.equal(
    lessonBlocks(
      [group(1, [lesson('same'), lesson('same')]), group(2, [lesson('same')])],
      date,
    ).length,
    1,
  );
});
test('kind badges classify source values without inventing a resit', () => {
  assert.equal(lessonKind('Лабораторные работы')?.label, 'Лаб');
  assert.equal(lessonKind('Практические занятия')?.label, 'Пр');
  assert.equal(lessonKind('Пересдача экзамена')?.label, 'Пересд');
  assert.equal(lessonKind('Экзамен')?.label, 'Экз');
  assert.equal(lessonKind('Зачёт')?.label, 'Зач');
  assert.equal(lessonKind('Военная подготовка'), undefined);
});

test('simultaneous distinct lessons of one group form a visual bundle without inventing shared events', () => {
  const a = group(1, [
    lesson('lab2', { subgroups: [2] }),
    lesson('lab1', { subgroups: [1] }),
  ]);
  const blocks = lessonBlocks([a, group(2, [lesson('solo')])], date);
  assert.equal(blocks.length, 2);
  const bundle = blocks.find((b) => b.members[0].id === 1)!;
  assert.deepEqual(
    bundle.parallel?.map((l) => l.id),
    ['lab1', 'lab2'],
  );
  assert.equal(bundle.common, false);
  assert.equal(bundle.members.length, 1);
  assert.equal(bundle.width, 0.5);
  assert.equal(
    lessonBlocks([group(2, []), a], date).find((b) => b.parallel)!.identity,
    bundle.identity,
  );
  const chosen = lessonBlocks(
    [{ ...a, selection: { ...a.selection, subgroup: 2 } }],
    date,
  );
  assert.equal(chosen.length, 1);
  assert.equal(chosen[0].parallel, undefined);
  assert.equal(chosen[0].lesson.id, 'lab2');
  const differentTime = lessonBlocks(
    [group(1, [lesson('a'), lesson('b', { end: 600 })])],
    date,
  );
  assert.equal(differentTime.length, 2);
  assert.ok(differentTime.every((b) => !b.parallel));
});

test('empty groups do not reserve lanes, and a long shared event stays one lane', () => {
  const military = lesson('military', { end: 1100 });
  const two = lessonBlocks([group(1, [military]), group(2, [military])], date);
  const five = lessonBlocks(
    [1, 2, 3, 4, 5].map((id) => group(id, [military])),
    date,
  );
  for (const blocks of [two, five]) {
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].width, 1);
    assert.equal(blocks[0].columns, 1);
    assert.equal(blocks[0].lesson.end, 1100);
    assert.equal(blocks[0].common, true);
  }
  const withEmpty = lessonBlocks([group(9, []), group(1, [military])], date);
  assert.equal(withEmpty[0].width, 1);
  assert.equal(withEmpty[0].common, false);
});

test('overlap chains reuse lanes at touching boundaries; disjoint clusters regain full width', () => {
  const blocks = lessonBlocks(
    [
      group(1, [lesson('a', { end: 540 })]),
      group(2, [lesson('b', { start: 510, end: 600 })]),
      group(3, [
        lesson('c', { start: 540, end: 600 }),
        lesson('d', { start: 600, end: 660 }),
      ]),
    ],
    date,
  );
  const [a, b, c, d] = blocks;
  assert.equal(a.column, c.column);
  assert.notEqual(a.column, b.column);
  assert.equal(a.columns, 2);
  assert.equal(d.width, 1);
  for (const x of blocks)
    for (const y of blocks) {
      if (
        x === y ||
        x.lesson.end <= y.lesson.start ||
        y.lesson.end <= x.lesson.start
      )
        continue;
      assert.ok(x.left + x.width <= y.left || y.left + y.width <= x.left);
    }
});

test('a long event does not hide concurrent lessons or allocate lanes for every participant', () => {
  const long = lesson('military', { end: 1100 });
  const blocks = lessonBlocks(
    [
      group(1, [long]),
      group(2, [long]),
      group(3, [lesson('lab', { start: 600, end: 690 })]),
      group(4, []),
    ],
    date,
  );
  assert.equal(blocks.length, 2);
  assert.ok(blocks.every((b) => b.columns === 2));
  assert.equal(blocks[0].members.length, 2);
  assert.equal(blocks[0].common, false);
});
