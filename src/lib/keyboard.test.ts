import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scheduleNavigation } from './keyboard.ts';

const key = (value: string, extra: Partial<KeyboardEvent> = {}) => ({
  key: value,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  isComposing: false,
  repeat: false,
  defaultPrevented: false,
  ...extra,
});

test('day selectors navigate within a week; week changes require an explicit command', () => {
  const nav = (value: string, day = '2026-10-14') =>
    scheduleNavigation(key(value), 'day', day, '2026-10-12');
  assert.deepEqual(nav('ArrowLeft'), { type: 'day', value: '2026-10-13' });
  assert.deepEqual(nav('ArrowRight'), { type: 'day', value: '2026-10-15' });
  assert.deepEqual(nav('Home'), { type: 'day', value: '2026-10-12' });
  assert.deepEqual(nav('End'), { type: 'day', value: '2026-10-18' });
  assert.deepEqual(nav('ArrowLeft', '2026-10-12'), {
    type: 'day',
    value: '2026-10-12',
  });
  assert.deepEqual(nav('ArrowRight', '2026-10-18'), {
    type: 'day',
    value: '2026-10-18',
  });
  assert.deepEqual(nav('PageUp'), { type: 'week', value: '2026-10-05' });
  assert.deepEqual(nav('PageDown'), { type: 'week', value: '2026-10-19' });
});

test('week navigation crosses month/year boundaries and does not intercept activation', () => {
  assert.deepEqual(
    scheduleNavigation(key('ArrowRight'), 'week', '2026-12-31', '2026-12-28'),
    { type: 'week', value: '2027-01-04' },
  );
  for (const value of ['Enter', ' ', 'Escape', 'Tab', 'ArrowDown', 'Home', 't'])
    assert.equal(
      scheduleNavigation(key(value), 'week', '2026-10-14', '2026-10-12'),
      undefined,
    );
});

test('modifiers, composition, consumed events and held week keys preserve existing controls', () => {
  for (const property of [
    'altKey',
    'ctrlKey',
    'metaKey',
    'shiftKey',
    'isComposing',
    'defaultPrevented',
    'repeat',
  ])
    assert.equal(
      scheduleNavigation(
        key('PageDown', { [property]: true }),
        'day',
        '2026-10-14',
        '2026-10-12',
      ),
      undefined,
    );
});
