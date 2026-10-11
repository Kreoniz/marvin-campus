import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectionData } from './selection-analytics.ts';

test('selection analytics describes whole groups and resolves public subgroup labels', () => {
  assert.deepEqual(selectionData({ id: 370, label: 'ИВТ-233' }), {
    group_id: 370,
    group_label: 'ИВТ-233',
    subgroup_id: 'all',
    subgroup_label: 'Вся группа',
  });
  assert.deepEqual(
    selectionData({ id: 370, label: 'ИВТ-233', subgroup: 596 }, [
      { id: 596, label: 'ИВТ-233/2' },
    ]),
    {
      group_id: 370,
      group_label: 'ИВТ-233',
      subgroup_id: 596,
      subgroup_label: 'ИВТ-233/2',
    },
  );
});
test('arbitrary shared-link labels never become analytics text', () => {
  const data = selectionData(
    { id: 370, label: 'some private text', subgroup: 596 },
    [{ id: 596, label: 'https://example.com/private?name=x' }],
  );
  assert.equal(data.group_label, '370');
  assert.equal(data.subgroup_label, '596');
});

test('public subgroup in a fresh readable link is not reported as the whole group', () => {
  const data = selectionData({ id: 694, label: 'ФИТ-232', subgroupNumber: 2 });
  assert.equal(data.subgroup_label, 'ФИТ-232/2');
  assert.equal(data.subgroup_id, 'unresolved');
  assert.equal(data.subgroup_number, 2);
});
