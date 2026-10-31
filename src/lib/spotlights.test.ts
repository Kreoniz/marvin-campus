import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { savedSpotlights, rememberSpotlights } from './spotlights.ts';
import { scheduleKey } from './schedule-ref.ts';
import type { Selection } from './types.ts';

function storage(t: TestContext, value: object) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value,
  });
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  });
}

test('spotlights restore typed identities independently per workspace and persist clearing', (t) => {
  const values = new Map<string, string>();
  storage(t, {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  const refs: Selection[] = [
    { id: 901, label: 'ТСТ-901' },
    { kind: 'lecturer', id: 901, label: 'Преподаватель' },
    { kind: 'auditorium', id: 901, label: '101' },
    { kind: 'vuc', id: 'd0123456789ab-p901', label: 'ВУЦ 901' },
  ];
  const keys = refs.map(scheduleKey);
  rememberSpotlights(keys, false);
  rememberSpotlights([keys[3]], true);
  assert.deepEqual(savedSpotlights(false), keys);
  assert.deepEqual(savedSpotlights(true), [keys[3]]);
  rememberSpotlights([], false);
  assert.deepEqual(savedSpotlights(false), []);
  assert.deepEqual(savedSpotlights(true), [keys[3]]);
});

test('corrupt or inaccessible storage does not break spotlight state', (t) => {
  let value = '';
  storage(t, { getItem: () => value });
  for (value of ['broken JSON', 'null', '{}', 'true'])
    assert.deepEqual(savedSpotlights(false), []);
  value = JSON.stringify(['rasp:group:901', 901, null, 'rasp:group:901']);
  assert.deepEqual(savedSpotlights(false), ['rasp:group:901']);
  value = JSON.stringify(
    Array.from({ length: 31 }, (_, i) => `rasp:group:${i}`),
  );
  assert.equal(savedSpotlights(false).length, 30);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => {
      throw new Error('Storage is unavailable');
    },
  });
  assert.deepEqual(savedSpotlights(false), []);
  assert.doesNotThrow(() => rememberSpotlights(['rasp:group:901'], false));
});
