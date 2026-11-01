import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subgroupSearch } from './subgroup-search.ts';
const base = { id: 901, label: 'АБ-101' };
const catalogue = { 901: [{ id: 77, label: 'АБ-101/2' }] };

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
