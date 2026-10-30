import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dayAnchor,
  restoreDayAnchor,
  revealDay,
  type DayColumn,
} from './calendar-navigation.ts';
const columns: DayColumn[] = [
  { date: 'mon', left: 48, width: 536 },
  { date: 'tue', left: 584, width: 166 },
  { date: 'wed', left: 750, width: 166 },
];
test('day selection reveals measured columns, respects the rail and clamps edges', () => {
  assert.equal(revealDay(columns[0], 0, 900, 48, 680, false), 0);
  assert.equal(revealDay(columns[1], 0, 900, 48, 680, false), 0);
  assert.equal(revealDay(columns[1], 0, 400, 48, 1180, false), 350);
  assert.equal(revealDay(columns[1], 0, 400, 48, 1180, true), 536);
  assert.equal(revealDay(columns[0], 300, 400, 48, 1180, false), 0);
  assert.equal(revealDay(columns[2], 0, 400, 48, 500, true), 500);
});
test('refresh anchors by date and pixel offset when width vectors swap but the maximum and total do not', () => {
  const anchor = dayAnchor(columns, 586, 48);
  assert.deepEqual(anchor, { date: 'tue', offset: 50 });
  const changed = [
    { date: 'mon', left: 48, width: 166 },
    { date: 'tue', left: 214, width: 536 },
    { date: 'wed', left: 750, width: 166 },
  ];
  assert.equal(restoreDayAnchor(changed, anchor, 48, 1180), 216);
  assert.equal(
    restoreDayAnchor(changed, { date: 'other-week', offset: 0 }, 48, 1180),
    undefined,
  );
  assert.equal(
    restoreDayAnchor(changed, { date: 'mon', offset: 500 }, 48, 1180),
    165,
  );
});
