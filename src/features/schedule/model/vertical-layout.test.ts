import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonBlocks } from '../../../lib/lesson-layout.ts';
import type { GroupSchedule, Lesson } from '../../../lib/types.ts';
import { dayMinimum, verticalLayout } from './vertical-layout.ts';
const date = '2026-10-26';
function schedules(intervals: [number, number][]): GroupSchedule[] {
  return intervals.map(([start, end], i) => ({
    selection: { id: i + 1, label: `Г-${i + 1}` },
    snapshot: {
      data: {
        groupId: i + 1,
        lessons: [
          {
            id: String.fromCharCode(65 + i),
            date,
            start,
            end,
            subject: 'Предмет',
            kind: 'Лекция',
            building: 'Корпус',
            room: '101',
            teacher: '',
            remote: false,
            subgroups: [],
          } satisfies Lesson,
        ],
        subgroups: [],
      },
      checkedAt: '',
      expiresAt: '',
      stale: false,
    },
  }));
}
function layout(intervals: [number, number][], scale = 0.72) {
  return verticalLayout(lessonBlocks(schedules(intervals), date), 480, scale);
}

test('a long overlap chain reserves its peak lanes without changing domain events', () => {
  const input = schedules([
    [480, 840],
    [480, 570],
    [480, 570],
    [480, 570],
    [570, 660],
    [630, 720],
  ]);
  const before = structuredClone(input);
  const blocks = lessonBlocks(input, date);
  const placed = verticalLayout(blocks, 480, 0.72);
  assert.deepEqual(
    placed.map((p) => [p.block.lesson.id, p.column, p.columns]),
    [
      ['A', 0, 4],
      ['B', 1, 4],
      ['C', 2, 4],
      ['D', 3, 4],
      ['E', 1, 4],
      ['F', 2, 4],
    ],
  );
  assert.equal(dayMinimum(placed), 672);
  assert.equal(dayMinimum([]), 174);
  assert.deepEqual(input, before);
  assert.deepEqual(
    placed.map((p) => p.block),
    blocks,
  );
});

test('an interior vacancy reuses its lane while the day retains its peak width', () => {
  const placed = layout([
    [480, 840],
    [481, 540],
    [482, 540],
    [483, 720],
    [540, 660],
  ]);
  assert.equal(placed.at(-1)!.column, 1);
  assert.equal(placed.at(-1)!.columns, 4);
});

test('connected chains use peak depth and touching ordinary events reuse lanes', () => {
  const placed = layout([
    [480, 540],
    [510, 600],
    [570, 660],
    [660, 720],
  ]);
  assert.deepEqual(
    placed.map((p) => [p.column, p.columns]),
    [
      [0, 2],
      [1, 2],
      [0, 2],
      [0, 1],
    ],
  );
});

test('short touching events reserve their painted extent at both calendar scales', () => {
  for (const scale of [0.65, 0.72]) {
    const placed = layout(
      [
        [480, 485],
        [485, 490],
        [490, 495],
      ],
      scale,
    );
    assert.deepEqual(
      placed.map((p) => p.column),
      [0, 1, 2],
    );
    assert.ok(placed.every((p) => p.columns === 3 && p.height === 18));
    assert.deepEqual(
      placed.map((p) => p.top),
      [0, 5 * scale, 10 * scale],
    );
  }
});

test('paint bridges semantic clusters; semantic overlap survives the visual three-pixel gap', () => {
  const cross = layout([
    [480, 540],
    [530, 535],
    [540, 600],
  ]);
  assert.deepEqual(
    cross.map((p) => [p.column, p.columns]),
    [
      [0, 2],
      [1, 2],
      [0, 2],
    ],
  );
  const overlap = layout([
    [480, 540],
    [539, 600],
  ]);
  assert.equal(overlap[0].columns, 2);
  assert.notEqual(overlap[0].column, overlap[1].column);
});

test('generated layouts have no semantic or painted collisions and use the reservation depth', () => {
  for (let seed = 1; seed <= 100; seed++) {
    let rng = seed;
    const next = () => {
      rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
      return rng;
    };
    const intervals = Array.from({ length: 24 }, (): [number, number] => {
      const start = 480 + (next() % 180);
      return [start, start + 1 + (next() % 150)];
    });
    for (const scale of [0.65, 0.72]) {
      const placed = layout(intervals, scale);
      const depth = Math.max(
        ...placed.map(
          (p) =>
            placed.filter(
              (q) =>
                q.top <= p.top &&
                Math.max((q.block.lesson.end - 480) * scale, q.top + q.height) >
                  p.top,
            ).length,
        ),
      );
      assert.equal(Math.max(...placed.map((p) => p.columns)), depth);
      for (const a of placed)
        for (const b of placed) {
          if (a === b) continue;
          const semantic =
            a.block.lesson.start < b.block.lesson.end &&
            b.block.lesson.start < a.block.lesson.end;
          const painted = a.top < b.top + b.height && b.top < a.top + a.height;
          if (semantic || painted) {
            const pitch = 166;
            assert.equal(a.columns, b.columns);
            const right = (p: typeof a) => p.column * pitch + 3 + 160;
            assert.ok(
              right(a) <= b.column * pitch + 3 ||
                right(b) <= a.column * pitch + 3,
              `collision seed ${seed}`,
            );
          }
        }
    }
  }
});
