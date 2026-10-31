import test from 'node:test';
import assert from 'node:assert/strict';
import { nearestVucDate } from './vuc-navigation.ts';
import type { VucRef } from './types.ts';

const ref: VucRef = {
  kind: 'vuc',
  id: 'd123456789abc-p102',
  label: 'ВУЦ · взвод 102',
  firstDate: '2026-09-03',
  lastDate: '2026-11-19',
};
test('restored VUC links prefer loaded week coverage over document beginning', () => {
  assert.equal(nearestVucDate(ref, '2026-10-30', ['2026-10-29']), '2026-10-29');
});
test('catalogue recovers the nearest covered date outside the loaded week', () => {
  const catalogue = {
    ...ref,
    coveredDates: ['2026-09-03', '2026-10-29', '2026-11-19'],
  };
  assert.equal(nearestVucDate(ref, '2026-11-06', [], catalogue), '2026-10-29');
  assert.equal(nearestVucDate(ref, '2026-11-18', [], catalogue), '2026-11-19');
  assert.equal(nearestVucDate(ref, '2026-10-30'), '2026-09-03');
  assert.equal(
    nearestVucDate({ id: 1, label: 'Group' }, '2026-10-30'),
    undefined,
  );
});
