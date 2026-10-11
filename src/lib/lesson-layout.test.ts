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
test('adjacent participants share one card; nonadjacent participants never cover the middle group', () => {
  const a = group(1, [lesson('shared')]),
    b = group(2, [lesson('solo')]),
    c = group(3, [lesson('shared')]);
  const mixed = lessonBlocks([a, b, c], date);
  const shared = mixed.filter((b) => b.members.length === 2);
  assert.deepEqual(
    shared.map((b) => [b.left, b.width]),
    [
      [0, 1 / 3],
      [2 / 3, 1 / 3],
    ],
  );
  assert.ok(shared.every((b) => b.linked && !b.common));
  const reordered = lessonBlocks([c, a, b], date).find(
    (b) => b.members.length === 2,
  )!;
  assert.equal(reordered.left, 0);
  assert.equal(reordered.width, 2 / 3);
  assert.equal(reordered.linked, false);
  assert.deepEqual(
    reordered.members.map((g) => g.id),
    [1, 3],
  );
});
test('parallel subgroups use disjoint sublanes, including a concurrent stream lesson', () => {
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
  for (const block of blocks.filter((b) => b.shown.some((g) => g.id === 1)))
    assert.ok(block.left + block.width <= 0.5 + 1e-8);
  const stream = blocks.filter((b) => b.lesson.id === 'stream');
  assert.equal(stream.length, 2);
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
  assert.equal(partial[0].width, 2 / 3);
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
