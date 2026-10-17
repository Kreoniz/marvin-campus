import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSavedSchedule } from './saved-schedules.ts';
import { STALE_GRACE } from './cache-policy.ts';

const week = '2026-10-12';
const checked = Date.parse('2026-10-12T02:00:00Z');
const body = {
  data: {
    groupId: 370,
    lessons: [{ id: 'lesson', date: week }],
    subgroups: [],
  },
  checkedAt: new Date(checked).toISOString(),
  expiresAt: new Date(checked + 600000).toISOString(),
  stale: false,
};

function storage(response: Response, key = `/api/schedule/370?week=${week}`) {
  return {
    open: async (name: string) => {
      assert.equal(name, 'campus-public-data-v1');
      return {
        match: async (request: RequestInfo | URL) =>
          request === key ? response.clone() : undefined,
      } as Cache;
    },
  };
}

test('reads only the exact selected group and week from the worker store', async () => {
  const saved = storage(Response.json(body));
  assert.deepEqual(await readSavedSchedule(370, week, saved, checked), body);
  assert.equal(await readSavedSchedule(371, week, saved, checked), undefined);
  assert.equal(
    await readSavedSchedule(370, '2026-10-19', saved, checked),
    undefined,
  );
});

test('restored data keeps its timestamps, becomes stale, and expires at the original cutoff', async () => {
  const saved = storage(Response.json(body));
  const stale = await readSavedSchedule(370, week, saved, checked + 600001);
  assert.equal(stale?.stale, true);
  assert.equal(stale?.checkedAt, body.checkedAt);
  assert.equal(stale?.expiresAt, body.expiresAt);
  assert.equal(
    await readSavedSchedule(
      370,
      week,
      saved,
      checked + 600000 + STALE_GRACE + 1,
    ),
    undefined,
  );
});

test('unavailable, malformed, error, mismatched and previous-week cache entries are misses', async () => {
  const invalid = [
    new Response('broken JSON'),
    Response.json({ error: 'failed' }, { status: 503 }),
    Response.json({ ...body, data: { ...body.data, groupId: 371 } }),
    Response.json({
      ...body,
      data: { ...body.data, lessons: [{ date: '2026-10-05' }] },
    }),
    Response.json({ ...body, checkedAt: 'invalid' }),
    Response.json({ ...body, data: { ...body.data, subgroups: undefined } }),
  ];
  for (const response of invalid)
    assert.equal(
      await readSavedSchedule(370, week, storage(response), checked),
      undefined,
    );
  assert.equal(
    await readSavedSchedule(
      370,
      week,
      {
        open: async () => {
          throw new Error('denied');
        },
      },
      checked,
    ),
    undefined,
  );
});

test('a verified empty schedule remains usable', async () => {
  const empty = { ...body, data: { ...body.data, lessons: [] } };
  assert.deepEqual(
    await readSavedSchedule(370, week, storage(Response.json(empty)), checked),
    empty,
  );
});
