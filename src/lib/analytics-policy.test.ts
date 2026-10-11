import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsData } from './analytics-policy.ts';
import { selectionData } from './selection-analytics.ts';
test('only selection and comparison reports inherit a validated link source', () => {
  const source = 'r1-1234567890abcdef';
  assert.deepEqual(
    analyticsData(
      'theme_changed',
      { theme: 'dark', source_share_id: source },
      source,
    ),
    { theme: 'dark' },
  );
  const selected = selectionData(
    { id: 694, label: 'ФИТ-232', subgroup: 1111, subgroupNumber: 2 },
    [{ id: 1111, label: 'ФИТ-232/2' }],
  );
  assert.deepEqual(analyticsData('group_selected', selected, source), {
    ...selected,
    source_share_id: source,
  });
  assert.equal(
    analyticsData('group_selected', selected, 'unvalidated private text')
      ?.source_share_id,
    undefined,
  );
});
test('unknown events and arbitrary text or URL properties cannot enter analytics', () => {
  assert.equal(analyticsData('unknown', { group_id: 694 }), undefined);
  assert.deepEqual(
    analyticsData('group_selected', {
      group_id: 694,
      group_label: 'ФИТ-232',
      teacher: 'Private name',
      search: 'text',
      url: '/fit-232',
      subgroup_label: 'arbitrary personal text',
    }),
    { group_id: 694, group_label: 'ФИТ-232' },
  );
  assert.deepEqual(
    analyticsData('share_opened', {
      share_id: 'r1-1234567890abcdef',
      link_format: 'readable',
      group_count: 2,
      mode: 'free',
      source_share_id: 'r1-1234567890abcdef',
    }),
    {
      share_id: 'r1-1234567890abcdef',
      link_format: 'readable',
      group_count: 2,
      mode: 'free',
    },
  );
});
