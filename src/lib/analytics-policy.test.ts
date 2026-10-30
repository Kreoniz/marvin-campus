import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsData } from './analytics-policy.ts';

test('selection events reject subgroup details, catalog IDs and link identifiers', () => {
  for (const name of [
    'group_added',
    'group_removed',
    'group_selected',
    'subgroup_changed',
  ]) {
    assert.deepEqual(
      analyticsData(name, {
        group_id: 694,
        group_label: 'ФИТ-232',
        subgroup_id: 1111,
        subgroup_number: 2,
        subgroup_label: 'ФИТ-232/2',
        selected: true,
        share_id: 'r1-1234567890abcdef',
        source_share_id: 'r1-1234567890abcdef',
        teacher: 'Private name',
        search: 'text',
        url: '/fit-232',
      }),
      { group_label: 'ФИТ-232', selected: true },
    );
  }
});

test('share and comparison events retain metrics without attribution', () => {
  for (const name of ['share_opened', 'share_link_copied']) {
    assert.deepEqual(
      analyticsData(name, {
        share_id: 'r1-1234567890abcdef',
        source_share_id: 'r1-1234567890abcdef',
        link_format: 'readable',
        group_count: 2,
        mode: 'free',
      }),
      { link_format: 'readable', group_count: 2, mode: 'free' },
    );
  }
  assert.deepEqual(
    analyticsData('comparison_used', {
      group_count: 2,
      mode: 'free',
      has_overlap: true,
      stale: false,
      source_share_id: 'r1-1234567890abcdef',
    }),
    { group_count: 2, mode: 'free', has_overlap: true, stale: false },
  );
});

test('unknown events, arbitrary text and invalid values cannot enter analytics', () => {
  for (const name of ['unknown', 'toString', '__proto__'])
    assert.equal(analyticsData(name, { group_label: 'ФИТ-232' }), undefined);
  assert.deepEqual(
    analyticsData('group_selected', {
      group_label: 'private text',
      selected: '2',
    }),
    {},
  );
  assert.deepEqual(
    analyticsData('schedule_loaded', {
      group_count: 31,
      week_relation: '2026-10-19',
      stale: 'yes',
      success: false,
    }),
    { success: false },
  );
});

test('mobile view events accept only the supported reading formats', () => {
  for (const view of ['day', 'week', 'list'])
    assert.deepEqual(
      analyticsData('mobile_view_changed', { view, date: '2026-10-19' }),
      { view },
    );
  assert.deepEqual(
    analyticsData('mobile_view_changed', { view: 'private text' }),
    {},
  );
});
