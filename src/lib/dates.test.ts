import test from 'node:test';
import assert from 'node:assert/strict';
import { weekLabel } from './dates.ts';
const today = '2026-10-30';
test('week labels keep current-year chrome compact and identify historical/future years', () => {
  assert.equal(weekLabel('2026-10-26', true, today), '26 окт.–1 нояб.');
  assert.equal(weekLabel('2025-10-06', true, today), '6–12 окт. 2025');
  assert.equal(weekLabel('2027-10-04', false, today), '4–10 октября 2027');
});
test('year-crossing week names retain both calendar years in full and compact forms', () => {
  assert.equal(
    weekLabel('2026-12-28', false, today),
    '28 дек. 2026 – 3 янв. 2027',
  );
  assert.equal(weekLabel('2026-12-28', true, today), '28.12.2026 – 03.01.2027');
});
