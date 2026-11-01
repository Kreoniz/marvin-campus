import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayContent } from './day-content.ts';
import type { GroupSchedule, Lesson } from './types.ts';
const date = '2026-11-02';
const lesson: Lesson = {
  id: 'a',
  date,
  start: 540,
  end: 630,
  subject: 'Предмет',
  kind: '',
  building: '',
  room: '',
  teacher: '',
  remote: false,
  subgroups: [],
};
const schedule = (lessons: Lesson[] = []): GroupSchedule => ({
  selection: { id: 901, label: 'АБ-101' },
  snapshot: { data: { lessons }, checkedAt: '', expiresAt: '', stale: false },
});

test('a visible empty source does not make hidden lessons or missing data an empty day', () => {
  const room = {
    ...schedule([lesson]),
    selection: { kind: 'auditorium' as const, id: 901, label: '101' },
  };
  const hidden = dayContent([schedule(), room], date, ['auditorium']);
  assert.equal(hidden.knownEmpty, false);
  assert.equal(hidden.hiddenLessons, true);
  const missing = dayContent(
    [schedule(), { selection: room.selection, error: 'Нет данных' }],
    date,
    ['auditorium'],
  );
  assert.equal(missing.knownEmpty, false);
  assert.deepEqual(missing.issues, ['missing']);
});

test('successful empty selected days and subgroups retain saved qualification', () => {
  const row = schedule([{ ...lesson, date: '2026-11-03' }]);
  assert.equal(dayContent([row], date).knownEmpty, true);
  row.snapshot!.stale = true;
  assert.equal(dayContent([row], date).saved, true);
  row.snapshot!.data = {
    lessons: [{ ...lesson, subgroups: [77] }],
    subgroups: [
      { id: 77, label: 'АБ-101/1' },
      { id: 78, label: 'АБ-101/2' },
    ],
  };
  row.selection = { id: 901, label: 'АБ-101', subgroup: 78, subgroupNumber: 2 };
  assert.equal(dayContent([row], date).knownEmpty, true);
});

test('unknown subgroup, uncovered VUC, loading and partial known days never prove emptiness', () => {
  const row = schedule([{ ...lesson, subgroups: [77] }]);
  row.selection = { id: 901, label: 'АБ-101', subgroupNumber: 2 };
  assert.deepEqual(dayContent([row], date).issues, ['subgroup']);
  const vuc: GroupSchedule = {
    ...schedule(),
    selection: { kind: 'vuc', id: 'd0123456789ab-p901', label: 'ВУЦ 901' },
  };
  assert.equal(dayContent([vuc], date).knownEmpty, false);
  const loading: GroupSchedule = {
    selection: { id: 902, label: 'ВГ-102' },
    loading: true,
  };
  assert.equal(dayContent([loading], date).loading, true);
  const partial = dayContent([schedule([lesson]), loading], date);
  assert.equal(partial.hasLessons, true);
  assert.equal(partial.knownEmpty, false);
  assert.equal(dayContent([], date).knownEmpty, false);
});
