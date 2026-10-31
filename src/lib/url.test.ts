import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groupSlug,
  normalizeView,
  parseView,
  readableGroups,
  shareID,
  viewURL,
} from './url.ts';
const base = 'https://campus.kreoniz.ru/';
const groups = [
  { id: 694, label: 'ФИТ-232' },
  { id: 370, label: 'ИВТ-233' },
];

test('Sunday defaults to next Monday and free windows; explicit dates stay unchanged', () => {
  const sunday = '2026-10-11';
  const view = parseView(new URL(base), sunday);
  assert.equal(view.week, '2026-10-12');
  assert.equal(view.day, '2026-10-12');
  assert.equal(view.mode, 'free');
  for (const query of [
    '?week=2026-10-05&day=2026-10-11',
    '?day=2026-10-11',
    '?d=2026-10-11',
  ]) {
    const explicit = parseView(new URL(base + query), sunday);
    assert.equal(explicit.week, '2026-10-05');
    assert.equal(explicit.day, sunday);
  }
  const saturday = parseView(new URL(base), '2026-10-10');
  assert.equal(saturday.week, '2026-10-05');
  assert.equal(saturday.day, '2026-10-10');
});
test('readable links preserve order, public subgroup number, day and mode without server state', () => {
  const view = {
    groups: [{ ...groups[0], subgroupNumber: 2 }, groups[1]],
    week: '2026-10-12',
    day: '2026-10-18',
    mode: 'free' as const,
  };
  const url = viewURL(view, new URL(base + 's/AbCd1234_-56?unused=x#old'));
  assert.equal(url.href, base + 'fit-232-s2+ivt-233?d=2026-10-18&v=free');
  assert.deepEqual(parseView(url, '2026-10-11', groups), view);
  assert.deepEqual(
    readableGroups(url)?.map((g) => [g.label, g.subgroupNumber]),
    [
      ['ФИТ-232', 2],
      ['ИВТ-233', undefined],
    ],
  );
  assert.equal(shareID(url), undefined);
});
test('legacy URLs and short payloads retain source IDs and migrate the removed mode', () => {
  const url = new URL(
    base +
      '?g=694~ФИТ-232~1111&g=370~ИВТ-233&week=2026-10-12&day=2026-10-16&mode=lessons',
  );
  const view = parseView(url);
  assert.equal(view.mode, 'free');
  assert.equal(view.groups[0].subgroup, 1111);
  assert.deepEqual(normalizeView(view), view);
  const edited = viewURL(view, new URL(base + 's/AbCd1234_-56'));
  assert.equal(edited.pathname, '/fit-232-sid1111+ivt-233');
  assert.deepEqual(parseView(edited, '2026-10-11', groups), view);
  assert.equal(shareID(new URL(base + 's/AbCd1234_-56')), 'AbCd1234_-56');
  assert.equal(shareID(new URL(base + 's/invalid')), undefined);
});
test('numeric fallback and malformed paths cannot introduce arbitrary labels or selections', () => {
  assert.equal(groupSlug({ id: 1, label: 'arbitrary private text' }), 'g1');
  const fallback = parseView(new URL(base + 'g1-s2?d=2026-10-18'));
  assert.deepEqual(fallback.groups, [
    { id: 1, label: 'Группа 1', subgroupNumber: 2 },
  ]);
  for (const path of [
    'g0',
    'g10000001',
    'fit-232-s0',
    'fit-232/ivt-233',
    '%invalid',
    'foo',
    Array(31).fill('fit-232').join('+'),
  ])
    assert.deepEqual(readableGroups(new URL(base + path)), []);
  assert.equal(readableGroups(new URL(base + 'fit-232+fit-232-s2'))?.length, 1);
  assert.equal(readableGroups(new URL(base)), undefined);
  assert.deepEqual(
    parseView(
      new URL(base + '?g=nope~X&week=2026-02-30&day=2025-01-01&mode=nope'),
      '2026-10-12',
    ),
    {
      groups: [],
      week: '2026-10-12',
      day: '2026-10-12',
      mode: 'free',
    },
  );
});
