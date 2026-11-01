import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subgroupSearch, subgroupSearchBase } from './subgroup-search.ts';
import { QueryClient } from '@tanstack/react-query';
import { scheduleOptions } from './queries.ts';
const base = { id: 901, label: 'АБ-101' };
const catalogue = { 901: [{ id: 77, label: 'АБ-101/2' }] };

test('a cold shorthand confirms the unique base week before offering its subgroup', async (t) => {
  const requests: string[] = [];
  t.mock.method(globalThis, 'fetch', async (path: string) => {
    requests.push(path);
    return Response.json({
      data: { groupId: base.id, subgroups: catalogue[901], lessons: [] },
      checkedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 1800000).toISOString(),
      stale: false,
    });
  });
  const client = new QueryClient();
  t.after(() => client.clear());
  const term = 'АБ-101-2';
  assert.equal(subgroupSearch(term, [], [base], {}), undefined);
  const group = subgroupSearchBase(term, [], [base]);
  assert.ok(group);
  const week = await client.fetchQuery(scheduleOptions(group.id, '2026-11-02'));
  assert.deepEqual(
    subgroupSearch(term, [], [base], { [group.id]: week.data.subgroups }),
    { ...base, subgroup: 77, subgroupNumber: 2 },
  );
  assert.deepEqual(requests, ['/api/schedule/901?week=2026-11-02']);
  assert.equal(
    subgroupSearchBase(term, [{ id: 902, label: term }], [base]),
    undefined,
  );
  assert.equal(
    subgroupSearchBase(term, [], [base, { ...base, id: 902 }]),
    undefined,
  );
});

test('subgroup search confirms one exact base and one public number', () => {
  assert.deepEqual(subgroupSearch(' аб-101-2 ', [], [base], catalogue), {
    ...base,
    subgroup: 77,
    subgroupNumber: 2,
  });
  assert.equal(subgroupSearch('АБ-101-2', [], [], catalogue), undefined);
  assert.equal(
    subgroupSearch(
      'АБ-101-2',
      [],
      [base, { id: 902, label: base.label }],
      catalogue,
    ),
    undefined,
  );
  assert.equal(subgroupSearch('АБ-101-2', [], [base], {}), undefined);
  assert.equal(
    subgroupSearch('АБ-101-2', [], [base], {
      901: [
        { id: 77, label: 'АБ-101/2' },
        { id: 78, label: 'АБ-101/2' },
      ],
    }),
    undefined,
  );
});

test('complete actual names win over suffix interpretation and fuzzy base hits', () => {
  const actual = { id: 902, label: 'АБ-101-2' };
  assert.equal(
    subgroupSearch(actual.label, [actual], [base], catalogue),
    undefined,
  );
  assert.equal(
    subgroupSearch(actual.label, [], [base, actual], catalogue),
    undefined,
  );
  assert.equal(
    subgroupSearch('АБ-101-2', [], [{ ...base, label: 'АБ-1010' }], catalogue),
    undefined,
  );
  for (const term of ['АБ-101', 'АБ-101-0', 'АБ-101-123', 'АБ-101/2'])
    assert.equal(subgroupSearch(term, [], [base], catalogue), undefined);
});
