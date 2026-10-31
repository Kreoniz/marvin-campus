import test from 'node:test';
import assert from 'node:assert/strict';
import { parseView, readableGroups, viewURL } from './url.ts';
import type { VucRef } from './types.ts';
const a: VucRef = {
  kind: 'vuc',
  id: 'daaaaaaaaaaaa-p101',
  label: 'ВУЦ · взвод 101',
  firstDate: '2026-09-03',
  coveredDates: ['2026-09-03'],
};
const b: VucRef = {
  kind: 'vuc',
  id: 'dbbbbbbbbbbbb-p101',
  label: 'ВУЦ · взвод 101',
  firstDate: '2025-09-01',
};
test('VUC page preserves document-scoped selections and page context in copied URLs', () => {
  const state = {
    groups: [a, b],
    week: '2026-10-26',
    day: '2026-10-29',
    mode: 'free' as const,
  };
  const url = viewURL(state, new URL('https://campus.example/vuc'));
  assert.equal(url.pathname, '/vuc');
  assert.equal(readableGroups(url), undefined);
  const restored = parseView(url);
  assert.deepEqual(
    restored.groups.map((ref) => ref.id),
    [a.id, b.id],
  );
  assert.equal(restored.day, state.day);
  assert.equal((restored.groups[0] as VucRef).coveredDates, undefined);
  assert.equal(
    viewURL(state, new URL('https://campus.example/')).pathname,
    '/compare',
  );
  assert.deepEqual(parseView(new URL('https://campus.example/vuc')).groups, []);
});
test('VUC links reject foreign or malformed sources instead of changing their kind', () => {
  for (const refs of [
    [a, { id: 1, label: 'Группа' }],
    [a, { kind: 'vuc', id: 'bad/path', label: 'ВУЦ' }],
  ]) {
    const url = new URL('https://campus.example/vuc');
    for (const ref of refs) url.searchParams.append('s', JSON.stringify(ref));
    assert.deepEqual(parseView(url).groups, []);
  }
});
