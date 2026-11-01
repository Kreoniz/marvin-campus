import { test } from 'node:test';
import assert from 'node:assert/strict';
import { savedScheduleView, rememberScheduleView } from './view-preference.ts';

test('view preference is separate per workspace and tolerates invalid or blocked storage', (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  assert.equal(savedScheduleView(false), undefined);
  rememberScheduleView(false, 'list');
  rememberScheduleView(true, 'day');
  assert.equal(savedScheduleView(false), 'list');
  assert.equal(savedScheduleView(true), 'day');
  values.set('campus-view', 'grid');
  assert.equal(savedScheduleView(false), undefined);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => {
      throw new Error('blocked');
    },
  });
  assert.equal(savedScheduleView(false), undefined);
  assert.doesNotThrow(() => rememberScheduleView(true, 'week'));
});
