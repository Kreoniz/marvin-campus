import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  advanceCohort,
  cohortSchedules,
  INITIAL_REVEAL_MS,
  LATE_REVEAL_MS,
} from './presentation-cohort.ts';
import type {
  GroupSchedule,
  GroupSelection,
  Snapshot,
  ScheduleData,
} from './types.ts';

const now = Date.parse('2026-10-26T03:00:00Z');
const week = '2026-10-26';
const snapshot = (
  name: string,
  expires = now + 60_000,
): Snapshot<ScheduleData> => ({
  data: { lessons: [], sourceLabel: name },
  checkedAt: new Date(now).toISOString(),
  expiresAt: new Date(expires).toISOString(),
  stale: false,
});
const row = (
  id: number,
  data?: Snapshot<ScheduleData>,
  fetching = true,
  error?: string,
): GroupSchedule & { selection: GroupSelection } => ({
  selection: { id, label: `ТСТ-${id}` },
  snapshot: data,
  loading: !data && !error,
  fetching,
  error,
});

test('staggered cold requests publish one complete cohort instead of each response', () => {
  const first = snapshot('first'),
    second = snapshot('second');
  let state = advanceCohort(undefined, 'a', [row(1), row(2)], now).state;
  state = advanceCohort(
    state,
    'a',
    [row(1, first, false), row(2)],
    now + 450,
  ).state;
  assert.equal(state.entries, undefined);
  const held = cohortSchedules(
    state,
    [row(1, first, false), row(2)],
    week,
    now + 450,
  );
  assert.ok(held.every((entry) => !entry.snapshot && entry.loading));
  state = advanceCohort(
    state,
    'a',
    [row(1, first, false), row(2, second, false)],
    now + 900,
  ).state;
  assert.equal(state.entries?.length, 2);
  assert.deepEqual(
    cohortSchedules(state, state.entries!, week, now + 900).map(
      (entry) => entry.snapshot?.data.sourceLabel,
    ),
    ['first', 'second'],
  );
});

test('bounded reveal includes known data, coalesces late arrivals, and settles failures immediately', () => {
  const a = snapshot('a'),
    b = snapshot('b');
  let state = advanceCohort(
    undefined,
    'a',
    [row(1), row(2), row(3)],
    now,
  ).state;
  const partial = [row(1, a, false), row(2), row(3)];
  state = advanceCohort(state, 'a', partial, now + INITIAL_REVEAL_MS).state;
  assert.equal(
    cohortSchedules(state, partial, week, now + INITIAL_REVEAL_MS).filter(
      (entry) => entry.snapshot,
    ).length,
    1,
  );
  const late = [row(1, a, false), row(2, b, false), row(3)];
  state = advanceCohort(state, 'a', late, now + INITIAL_REVEAL_MS + 100).state;
  assert.equal(state.entries?.[1].snapshot, undefined);
  state = advanceCohort(
    state,
    'a',
    late,
    now + INITIAL_REVEAL_MS + 100 + LATE_REVEAL_MS,
  ).state;
  assert.equal(state.entries?.[1].snapshot, b);
  const failed = [
    row(1, a, false),
    row(2, b, false),
    row(3, undefined, false, 'Источник недоступен'),
  ];
  state = advanceCohort(state, 'a', failed, now + 4_000).state;
  assert.equal(state.entries?.[2].error, 'Источник недоступен');
  assert.equal(state.entries?.[2].snapshot, undefined);
});

test('new generations cannot retain old-week lessons, while reorder/subgroup changes stay immediate', () => {
  const a = snapshot('a'),
    b = snapshot('b');
  const ready = [row(1, a, false), row(2, b, false)];
  const state = advanceCohort(undefined, 'a', ready, now).state;
  const reordered = [
    { ...ready[1], selection: { ...ready[1].selection, subgroup: 22 } },
    ready[0],
  ];
  const same = advanceCohort(state, 'a', reordered, now + 1).state;
  assert.equal(same, state);
  assert.deepEqual(
    cohortSchedules(same, reordered, week, now + 1).map(
      (entry) => entry.selection.id,
    ),
    [2, 1],
  );
  assert.equal(
    cohortSchedules(same, reordered, week, now + 1)[0].selection.subgroup,
    22,
  );
  const next = advanceCohort(
    state,
    'new-week',
    [row(1), row(2)],
    now + 2,
  ).state;
  assert.equal(next.entries, undefined);
  assert.ok(
    cohortSchedules(next, [row(1), row(2)], '2026-11-02', now + 2).every(
      (entry) => !entry.snapshot,
    ),
  );
});

test('revalidation holds valid old data but cannot extend a held snapshot hard expiry', () => {
  const old = snapshot('old', now - 86_399_000);
  const fresh = snapshot('fresh');
  let state = advanceCohort(
    undefined,
    'same-week',
    [row(1, old, false), row(2, old, false)],
    now,
  ).state;
  const updating = [row(1, fresh, false), row(2, old, true)];
  state = advanceCohort(state, 'same-week', updating, now + 100).state;
  assert.equal(
    cohortSchedules(state, updating, week, now + 100)[0].snapshot?.data
      .sourceLabel,
    'old',
  );
  const expired = cohortSchedules(state, updating, week, now + 1_001);
  assert.ok(expired.every((entry) => !entry.snapshot));
  assert.match(expired[0].error!, /слишком старый/);
});

test('adding a schedule retains known same-week inputs without retaining removed or other-week inputs', () => {
  const a = snapshot('a'),
    b = snapshot('b');
  const ready = [row(1, a, false), row(2, b, false)];
  const state = advanceCohort(undefined, 'old-set', ready, now, week).state;
  const adding = [...ready, row(3)];
  const next = advanceCohort(state, 'new-set', adding, now + 100, week).state;
  assert.equal(
    cohortSchedules(next, adding, week, now + 100).filter(
      (entry) => entry.snapshot,
    ).length,
    2,
  );
  const removing = [ready[1], row(3)];
  const removed = advanceCohort(
    next,
    'removed',
    removing,
    now + 200,
    week,
  ).state;
  assert.deepEqual(
    cohortSchedules(removed, removing, week, now + 200).map(
      (entry) => entry.selection.id,
    ),
    [2, 3],
  );
  const moved = advanceCohort(
    removed,
    'new-week',
    [row(2), row(3)],
    now + 300,
    '2026-11-02',
  ).state;
  assert.ok(
    cohortSchedules(moved, [row(2), row(3)], '2026-11-02', now + 300).every(
      (entry) => !entry.snapshot,
    ),
  );
});
