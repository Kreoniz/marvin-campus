import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarBounds } from './calendar-bounds.ts';

test('VUC display starts at nine and ends after the last event without cropping real early lessons', () => {
  assert.deepEqual(calendarBounds([{ start: 540, end: 1045 }], true), {
    start: 540,
    end: 1080,
  });
  assert.deepEqual(
    calendarBounds(
      [
        { start: 480, end: 855 },
        { start: 1050, end: 1205 },
      ],
      true,
    ),
    { start: 480, end: 1260 },
  );
  assert.deepEqual(calendarBounds([{ start: 600, end: 640 }], true), {
    start: 540,
    end: 660,
  });
});

test('unknown VUC days keep a useful default range; academic and mixed views retain eight to nineteen', () => {
  assert.deepEqual(calendarBounds([], true), { start: 540, end: 1080 });
  assert.deepEqual(calendarBounds([{ start: 540, end: 900 }]), {
    start: 480,
    end: 1140,
  });
  assert.deepEqual(calendarBounds([{ start: 430, end: 1205 }]), {
    start: 420,
    end: 1260,
  });
});
