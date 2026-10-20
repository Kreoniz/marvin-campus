import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonSubgroupNumber } from './subgroup-colors.ts';
import type { Lesson } from './types.ts';

const lesson = (subgroups: number[]) => ({ subgroups }) as Lesson;
const catalog = [
  { id: 501, label: 'Г-101/2' },
  { id: 902, label: 'Г-101/1' },
  { id: 903, label: 'Г-101/3' },
];

test('subgroup colors use the source catalog public number, independently of order', () => {
  assert.equal(lessonSubgroupNumber([lesson([501])], catalog), 2);
  assert.equal(
    lessonSubgroupNumber([lesson([902])], [...catalog].reverse()),
    1,
  );
  assert.equal(lessonSubgroupNumber([lesson([903])], catalog), 3);
  assert.equal(
    lessonSubgroupNumber([lesson([501]), lesson([501, 501])], catalog),
    2,
  );
});

test('whole-group lessons and missing membership retain the group color', () => {
  assert.equal(lessonSubgroupNumber([], catalog), undefined);
  assert.equal(lessonSubgroupNumber([lesson([])], catalog), undefined);
  assert.equal(
    lessonSubgroupNumber([lesson([501]), lesson([])], catalog),
    undefined,
  );
});

test('unknown membership never borrows a known subgroup shade', () => {
  assert.equal(lessonSubgroupNumber([lesson([501])], []), undefined);
  assert.equal(lessonSubgroupNumber([lesson([777])], catalog), undefined);
  assert.equal(lessonSubgroupNumber([lesson([501, 777])], catalog), undefined);
  assert.equal(
    lessonSubgroupNumber([lesson([501]), lesson([777])], catalog),
    undefined,
  );
  assert.equal(
    lessonSubgroupNumber(
      [lesson([501])],
      [{ id: 501, label: 'Подгруппа без публичного номера' }],
    ),
    undefined,
  );
});

test('multiple memberships retain the base color across copies of one event', () => {
  assert.equal(lessonSubgroupNumber([lesson([501, 902])], catalog), undefined);
  assert.equal(
    lessonSubgroupNumber([lesson([501]), lesson([902])], catalog),
    undefined,
  );
  assert.equal(
    lessonSubgroupNumber(
      [lesson([501, 902])],
      [
        { id: 501, label: 'Г-101/2' },
        { id: 902, label: 'Г-101/2' },
      ],
    ),
    undefined,
  );
});

test('conflicting catalog entries cannot assign an arbitrary shade', () => {
  const own = [lesson([501])];
  assert.equal(
    lessonSubgroupNumber(own, [...catalog, { id: 501, label: 'Г-101/1' }]),
    undefined,
  );
  assert.equal(
    lessonSubgroupNumber(own, [
      ...catalog,
      { id: 501, label: 'Подгруппа без публичного номера' },
    ]),
    undefined,
  );
  assert.equal(
    lessonSubgroupNumber(own, [...catalog, { id: 501, label: 'Г-101/2' }]),
    2,
  );
});
