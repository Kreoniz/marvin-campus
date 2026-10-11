import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessonGroupLabel, mergeSubgroups } from './subgroups.ts';
import type { Lesson } from './types.ts';

test('lesson labels show public subgroup numbers without exposing source IDs', () => {
  const group = { id: 370, label: 'ИВТ-233' };
  const catalog = [
    { id: 590, label: 'ИВТ-233/1' },
    { id: 591, label: 'ИВТ-233/2' },
  ];
  const event = (subgroups: number[]) => ({ subgroups }) as Lesson;
  assert.equal(lessonGroupLabel(group, [event([591])], catalog), 'ИВТ-233/2');
  assert.equal(
    lessonGroupLabel(group, [event([591]), event([590])], catalog),
    'ИВТ-233/1,2',
  );
  assert.equal(
    lessonGroupLabel(group, [event([591]), event([])], catalog),
    'ИВТ-233',
  );
  assert.equal(lessonGroupLabel(group, [event([9999])], catalog), 'ИВТ-233');
  assert.equal(
    lessonGroupLabel({ ...group, subgroup: 591 }, [event([])], catalog),
    'ИВТ-233/2',
  );
  assert.equal(
    lessonGroupLabel({ ...group, subgroupNumber: 2 }, [event([])], []),
    'ИВТ-233/2',
  );
  assert.equal(
    lessonGroupLabel({ ...group, subgroup: 591 }, [event([])], []),
    'ИВТ-233',
  );
});

test('subgroup names survive empty weeks; newer source labels replace old ones', () => {
  const known = [
    { id: 1111, label: 'ФИТ-232/2' },
    { id: 1110, label: 'ФИТ-232/1' },
  ];
  const nextWeek = mergeSubgroups(known, []);
  assert.equal(nextWeek.find((s) => s.id === 1111)?.label, 'ФИТ-232/2');
  const updated = mergeSubgroups(nextWeek, [
    { id: 1111, label: 'ФИТ-232/2 новое' },
  ]);
  assert.equal(updated.length, 2);
  assert.equal(updated.find((s) => s.id === 1111)?.label, 'ФИТ-232/2 новое');
  assert.equal(known[0].label, 'ФИТ-232/2');
});

test('public subgroup numbers wait for the catalog and never expand to all subgroups', async () => {
  const { selectedSubgroup, publicSubgroup } = await import('./subgroups.ts');
  const { lessonsFor } = await import('./domain.ts');
  const selection = { id: 694, label: 'ФИТ-232', subgroupNumber: 2 };
  const catalog = [
    { id: 1110, label: 'ФИТ-232/1' },
    { id: 1111, label: 'ФИТ-232/2' },
  ];
  assert.equal(publicSubgroup(catalog[1].label), 2);
  assert.equal(selectedSubgroup(selection, []), -1);
  assert.equal(selectedSubgroup(selection, catalog), 1111);
  const source = (subgroups: number[], start: number) => ({
    id: String(start),
    date: '2026-10-12',
    start,
    end: start + 60,
    subject: 'A',
    kind: 'Лекция',
    building: '',
    room: '',
    teacher: '',
    remote: false,
    subgroups,
  });
  const snapshot = {
    data: {
      groupId: 694,
      lessons: [source([], 480), source([1110], 600), source([1111], 720)],
      subgroups: [],
    },
    checkedAt: '',
    expiresAt: '',
    stale: false,
  };
  const group = { selection, snapshot };
  assert.deepEqual(
    lessonsFor(group).map((l) => l.start),
    [480],
  );
  assert.deepEqual(
    lessonsFor({
      ...group,
      snapshot: { ...snapshot, data: { ...snapshot.data, subgroups: catalog } },
    }).map((l) => l.start),
    [480, 720],
  );
  assert.equal(selection.subgroupNumber, 2);
});
