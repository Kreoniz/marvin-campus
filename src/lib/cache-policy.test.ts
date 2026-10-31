import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  snapshotStaleTime,
  snapshotChangeAt,
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
test('fetching an older snapshot does not renew freshness; a future week becoming current adopts thirty minutes', () => {
  assert.equal(
    snapshotStaleTime(
      snapshot,
      '2026-10-12',
      checked + 5 * 60000,
      '2026-10-12',
    ),
    25 * 60000,
  );
  assert.equal(
    snapshotStaleTime(
      snapshot,
      '2026-10-12',
      checked + 15 * 60000,
      '2026-10-12',
    ),
    15 * 60000,
  );
  assert.equal(
    snapshotStaleTime(
      snapshot,
      '2026-10-12',
      checked + 30 * 60000,
      '2026-10-12',
    ),
    0,
  );
  // Existing responses with a shorter server deadline keep that deadline.
  assert.equal(
    snapshotStaleTime(
      { ...snapshot, expiresAt: new Date(checked + 10 * 60000).toISOString() },
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
});
test('offline fallback has the same hard cutoff as the server and preserves its check date', () => {
  const deadline = checked + 30 * 60000;
  const old = {
    ...snapshot,
    expiresAt: new Date(deadline).toISOString(),
    stale: true,
    warning: 'Нет сети.',
  };
  assert.equal(usableSnapshot(old, '2026-10-12', deadline + STALE_GRACE), old);
  assert.equal(
    usableSnapshot(old, '2026-10-12', deadline + STALE_GRACE + 1),
    undefined,
  );
});

test('snapshot transitions wake an idle view at freshness and hard expiry', () => {
  const deadline = checked + 30 * 60000;
  assert.equal(snapshotChangeAt(snapshot, '2026-10-12', checked), deadline + 1);
  const stale = usableSnapshot(snapshot, '2026-10-12', deadline + 1)!;
  assert.equal(stale.stale, true);
  assert.equal(stale.checkedAt, snapshot.checkedAt);
  assert.equal(stale.expiresAt, snapshot.expiresAt);
  assert.equal(
    snapshotChangeAt(stale, '2026-10-12', deadline + 1),
    deadline + STALE_GRACE + 1,
  );
  assert.equal(
    snapshotChangeAt(stale, '2026-10-12', deadline + STALE_GRACE + 1),
    undefined,
  );
  assert.equal(
    usableSnapshot(
      { ...snapshot, expiresAt: 'invalid' },
      '2026-10-12',
      checked,
    ),
    undefined,
  );
});

test('Monday wakes a future snapshot and applies the shorter current-week TTL', () => {
  const checked = Date.parse('2026-10-18T17:55:00Z'); // Sunday 23:55 in Omsk.
  const future = {
    ...snapshot,
    checkedAt: new Date(checked).toISOString(),
    expiresAt: new Date(checked + 3600000).toISOString(),
  };
  const midnight = Date.parse('2026-10-18T18:00:00Z');
  assert.equal(snapshotChangeAt(future, '2026-10-19', checked), midnight);
  assert.equal(
    snapshotChangeAt(future, '2026-10-19', midnight),
    checked + 30 * 60000 + 1,
  );
  assert.equal(
    usableSnapshot(future, '2026-10-19', checked + 11 * 60000)?.stale,
    false,
  );
  assert.equal(
    usableSnapshot(future, '2026-10-19', checked + 31 * 60000)?.stale,
    true,
  );
});
