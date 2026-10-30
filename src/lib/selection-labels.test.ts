import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scheduleLabels,
  selectionLabels,
  vucOptionLabel,
} from './selection-labels.ts';
import type { GroupSchedule, VucRef } from './types.ts';

const a: VucRef = {
  kind: 'vuc',
  id: 'da-p101',
  label: 'ВУЦ · взвод 101',
  sourcePeriod: '2026-09-03 – 2026-12-24',
  sourceLabel: 'Документ А',
};
const b = { ...a, id: 'db-p101', sourceLabel: 'Документ Б' };
test('compact labels change only for colliding document-scoped platoons', () => {
  const group = { id: 1, label: 'ФИТ-232', subgroupNumber: 2 };
  assert.equal(selectionLabels([a, group])(a), 'ВУЦ 101');
  assert.equal(selectionLabels([a, group])(group), 'ФИТ-232/2');
  const labels = selectionLabels([b, a]);
  assert.equal(labels(a), 'ВУЦ 101 · 2026 · Документ А');
  assert.equal(labels(b), 'ВУЦ 101 · 2026 · Документ Б');
  assert.equal(vucOptionLabel(a, [a, b]), labels(a));
  const archived = { ...b, sourcePeriod: '2025' };
  assert.equal(selectionLabels([a, archived])(archived), 'ВУЦ 101 · 2025');
});
test('identical or absent metadata still distinguishes documents without mutating refs', () => {
  const same = { ...a, id: b.id };
  assert.notEqual(
    selectionLabels([a, same])(a),
    selectionLabels([a, same])(same),
  );
  const sparse = [a, b].map(({ kind, id, label }) => ({ kind, id, label }));
  const original = JSON.stringify(sparse);
  const rows = sparse.map((selection, index) => ({
    selection,
    snapshot: {
      data: { sourceLabel: `Документ ${index + 1}`, sourcePeriod: '2026' },
    },
  })) as GroupSchedule[];
  const labels = scheduleLabels(rows);
  assert.equal(labels(sparse[0]), 'ВУЦ 101 · 2026 · Документ 1');
  assert.equal(labels(sparse[1]), 'ВУЦ 101 · 2026 · Документ 2');
  assert.equal(JSON.stringify(sparse), original);
  assert.notEqual(
    selectionLabels(sparse)(sparse[0]),
    selectionLabels(sparse)(sparse[1]),
  );
});
