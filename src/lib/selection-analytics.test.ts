import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectionData } from './selection-analytics.ts';

test('selection analytics keeps the group and only a subgroup-use flag', () => {
  assert.deepEqual(selectionData({ id: 370, label: 'ИВТ-233' }), {
    group_label: 'ИВТ-233',
    selected: false,
  });
  for (const selection of [
    { id: 370, label: 'ИВТ-233', subgroup: 596 },
    { id: 370, label: 'ИВТ-233', subgroupNumber: 2 },
    { id: 370, label: 'ИВТ-233', subgroup: 596, subgroupNumber: 2 },
  ])
    assert.deepEqual(selectionData(selection), {
      group_label: 'ИВТ-233',
      selected: true,
    });
});

test('arbitrary shared-link labels never become analytics text', () => {
  assert.deepEqual(
    selectionData({ id: 370, label: 'private text', subgroup: 596 }),
    {
      group_label: '370',
      selected: true,
    },
  );
});
