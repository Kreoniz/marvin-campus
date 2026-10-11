import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scheduleKey,
  snapshotStaleTime,
  usableSnapshot,
  STALE_GRACE,
} from './cache-policy.ts';
const checked = Date.parse('2026-10-12T02:00:00Z');
const snapshot = {
  data: [],
  checkedAt: new Date(checked).toISOString(),
  expiresAt: new Date(checked + 3600000).toISOString(),
  stale: false,
};
test('fetching an older snapshot does not renew freshness; a future week becoming current adopts ten minutes', () => {
  assert.equal(
    snapshotStaleTime(
      snapshot,
      '2026-10-12',
      checked + 5 * 60000,
      '2026-10-12',
    ),
    5 * 60000,
  );
  assert.equal(
    snapshotStaleTime(
      snapshot,
      '2026-10-12',
      checked + 15 * 60000,
      '2026-10-12',
    ),
    0,
  );
  assert.equal(
    snapshotStaleTime(
      snapshot,
      '2026-10-12',
      checked + 5 * 60000,
      '2026-10-05',
    ),
    55 * 60000,
  );
  assert.equal(
    snapshotStaleTime(
      { ...snapshot, stale: true },
      '2026-10-12',
      checked,
      '2026-10-05',
    ),
    0,
  );
  assert.deepEqual(scheduleKey(370, '2026-10-12'), [
    'schedule',
    370,
    '2026-10-12',
  ]);
});
test('offline fallback has the same hard cutoff as the server and preserves its check date', () => {
  const old = { ...snapshot, stale: true, warning: 'Нет сети.' };
  assert.equal(
    usableSnapshot(old, '2026-10-12', checked + 3600000 + STALE_GRACE),
    old,
  );
  assert.equal(
    usableSnapshot(old, '2026-10-12', checked + 3600000 + STALE_GRACE + 1),
    undefined,
  );
});
