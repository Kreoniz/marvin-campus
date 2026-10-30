import assert from 'node:assert/strict';
import { test } from 'node:test';
import { QueryClient } from '@tanstack/react-query';
import { loadVucWeek, vucSearchOptions } from '../features/resources/api.ts';
import type { VucRef } from './types.ts';

const ref: VucRef = {
  kind: 'vuc',
  id: 'd0123456789ab-p901',
  label: 'ВУЦ 901',
};
const week = '2026-10-26';
const snapshot = (data: unknown) => ({
  data,
  checkedAt: '2026-10-30T00:00:00Z',
  expiresAt: '2026-10-31T00:00:00Z',
  stale: true,
});

test('VUC week availability remains optional and rejects nonboolean metadata', async (t) => {
  let availability: unknown;
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(
      snapshot({
        kind: 'vuc',
        id: ref.id,
        lessons: [],
        coveredDates: [],
        originalAvailable: availability,
      }),
    ),
  );
  for (const value of [undefined, false, true]) {
    availability = value;
    assert.equal((await loadVucWeek(ref, week)).data.originalAvailable, value);
  }
  for (const value of ['true', 'false', 1, null, {}]) {
    availability = value;
    await assert.rejects(loadVucWeek(ref, week));
  }
});

test('VUC catalogue only accepts explicit boolean download metadata', async (t) => {
  let availability: unknown;
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json(snapshot([{ ...ref, originalAvailable: availability }])),
  );
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  try {
    for (const value of [undefined, false, true]) {
      availability = value;
      const response = await client.fetchQuery(vucSearchOptions('901'));
      assert.equal(response.data[0].originalAvailable, value);
    }
    for (const value of ['true', 'false', 1, null, {}]) {
      availability = value;
      await assert.rejects(client.fetchQuery(vucSearchOptions('901')));
    }
  } finally {
    client.clear();
  }
});
