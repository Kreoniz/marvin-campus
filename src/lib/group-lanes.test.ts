import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupLanes } from './group-lanes.ts';
import { lessonBlocks } from './lesson-layout.ts';
import type { GroupSchedule, Lesson } from './types.ts';

const date = '2026-10-12';
const lesson = (id: string, start = 480, end = 565): Lesson => ({
  id,
  date,
  start,
  end,
  subject: 'Лекция',
  kind: 'Лекция',
  building: 'УЛК-1',
  room: '101',
  teacher: '',
  remote: false,
  subgroups: [],
});
const group = (id: number, lessons: Lesson[]): GroupSchedule => ({
  selection: { id, label: `Г-${id}` },
  snapshot: {
    data: { groupId: id, lessons, subgroups: [] },
    checkedAt: '',
    expiresAt: '',
    stale: false,
  },
});

test('shared events occupy only their participants slots, preserving source blocks', () => {
  const shared = lesson('shared');
  const blocks = lessonBlocks(
    [group(1, [shared]), group(2, []), group(3, [shared])],
    date,
  );
  const original = structuredClone(blocks);
  const placed = groupLanes(blocks, [1, 2, 3]);

  assert.equal(placed.length, 2);
  assert.deepEqual(
    placed.map(({ groupId, left, width }) => ({ groupId, left, width })),
    [
      { groupId: 1, left: 0, width: 1 / 3 },
      { groupId: 3, left: 2 / 3, width: 1 / 3 },
    ],
  );
  assert.ok(placed.every(({ block }) => block === blocks[0]));
  assert.deepEqual(blocks, original);
});

test('empty and unavailable groups reserve slots and selection order controls placement', () => {
  const unavailable: GroupSchedule = {
    selection: { id: 3, label: 'Г-3' },
    error: 'Источник недоступен',
  };
  const blocks = lessonBlocks(
    [group(1, [lesson('solo')]), group(2, []), unavailable],
    date,
  );
  const [first] = groupLanes(blocks, [1, 2, 3]);
  const [reordered] = groupLanes(blocks, [3, 2, 1]);

  assert.equal(first.left, 0);
  assert.equal(reordered.left, 2 / 3);
  assert.equal(first.width, 1 / 3);
  assert.equal(reordered.width, 1 / 3);
  assert.equal(first.block, reordered.block);
  assert.equal(first.block.common, false);
});

test('overlapping events split their own group slot and touching events reuse space', () => {
  const blocks = lessonBlocks(
    [
      group(1, [
        lesson('long', 480, 660),
        lesson('early', 490, 550),
        lesson('touching', 550, 600),
        lesson('later', 660, 720),
      ]),
      group(2, [lesson('other', 480, 720)]),
    ],
    date,
  );
  const placed = groupLanes(blocks, [1, 2]);
  const byId = (id: string) =>
    placed.find(({ block }) => block.lesson.id === id)!;

  assert.equal(byId('long').left, 0);
  assert.equal(byId('long').width, 1 / 4);
  assert.equal(byId('early').left, 1 / 4);
  assert.equal(byId('early').width, 1 / 4);
  assert.equal(byId('touching').left, byId('early').left);
  assert.equal(byId('touching').width, byId('early').width);
  assert.equal(byId('later').left, 0);
  assert.equal(byId('later').width, 1 / 2);
  assert.equal(byId('other').left, 1 / 2);
  assert.equal(byId('other').width, 1 / 2);
});

test('a shared event splits only the participant slot with a local overlap', () => {
  const shared = lesson('shared', 480, 600);
  const blocks = lessonBlocks(
    [
      group(1, [shared, lesson('local', 500, 565)]),
      group(2, []),
      group(3, [shared]),
    ],
    date,
  );
  const placed = groupLanes(blocks, [1, 2, 3]);
  const sharedCopies = placed.filter(
    ({ block }) => block.lesson.id === 'shared',
  );

  assert.deepEqual(
    sharedCopies.map(({ groupId, left, width }) => ({ groupId, left, width })),
    [
      { groupId: 1, left: 0, width: 1 / 6 },
      { groupId: 3, left: 2 / 3, width: 1 / 3 },
    ],
  );
  assert.equal(sharedCopies[0].block, sharedCopies[1].block);
  assert.deepEqual(groupLanes([...blocks].reverse(), [1, 2, 3]), placed);
});

test('overlap clusters keep every card inside its group and separate concurrent events', () => {
  const blocks = lessonBlocks(
    [
      group(1, [
        lesson('a', 480, 600),
        lesson('b', 500, 660),
        lesson('c', 550, 580),
        lesson('d', 600, 700),
      ]),
      group(2, [lesson('e', 480, 720)]),
    ],
    date,
  );
  const ids = [3, 1, 4, 2];
  const placed = groupLanes(blocks, ids);
  const epsilon = 1e-10;

  for (const entry of placed) {
    const groupColumn = ids.indexOf(entry.groupId);
    assert.ok(entry.width > 0);
    assert.ok(entry.left >= groupColumn / ids.length - epsilon);
    assert.ok(
      entry.left + entry.width <= (groupColumn + 1) / ids.length + epsilon,
    );
    for (const other of placed) {
      if (
        entry === other ||
        entry.groupId !== other.groupId ||
        entry.block.lesson.start >= other.block.lesson.end ||
        other.block.lesson.start >= entry.block.lesson.end
      )
        continue;
      assert.ok(
        entry.left + entry.width <= other.left + epsilon ||
          other.left + other.width <= entry.left + epsilon,
      );
    }
  }
});

test('empty selections produce no cards and repeated IDs do not duplicate slots', () => {
  const blocks = lessonBlocks([group(1, [lesson('solo')])], date);
  assert.deepEqual(groupLanes(blocks, []), []);
  assert.deepEqual(groupLanes([], [1, 2]), []);
  assert.deepEqual(groupLanes(blocks, [2]), []);
  assert.deepEqual(groupLanes(blocks, [1, 1, 2]), groupLanes(blocks, [1, 2]));
});
