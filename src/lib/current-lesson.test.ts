import test from 'node:test';
import assert from 'node:assert/strict';
import { currentOrNextLessons } from './current-lesson.ts';
import type { GroupSchedule, Lesson } from './types.ts';

const lesson = (id: string, start: number, end: number): Lesson => ({
  id,
  date: '2026-11-02',
  start,
  end,
  subject: id,
  kind: 'Лекция',
  building: '',
  room: '',
  teacher: '',
  remote: false,
  subgroups: [],
});
const schedule: GroupSchedule = {
  selection: { id: 1, label: 'А-101' },
  snapshot: {
    data: {
      lessons: [
        lesson('a', 540, 630),
        lesson('b', 540, 600),
        lesson('c', 720, 810),
      ],
    },
    checkedAt: '2026-11-02T00:00:00Z',
    expiresAt: '2026-11-02T01:00:00Z',
    stale: false,
  },
};

test('current/next selection uses Omsk time, today only, and returns parallel lessons together', () => {
  const now = new Date('2026-11-02T03:30:00Z'); // 09:30 in Omsk
  assert.deepEqual(
    currentOrNextLessons([schedule], '2026-11-02', now)?.lessons.map(
      (item) => item.id,
    ),
    ['b', 'a'],
  );
  assert.equal(
    currentOrNextLessons([schedule, schedule], '2026-11-02', now),
    undefined,
  );
  assert.equal(currentOrNextLessons([schedule], '2026-11-03', now), undefined);
});

test('Omsk midnight and a known empty today use the selected local date', () => {
  const row = structuredClone(schedule);
  row.snapshot!.checkedAt = '2026-11-01T18:00:00Z';
  row.snapshot!.expiresAt = '2026-11-01T19:00:00Z';
  row.snapshot!.data.lessons = [lesson('midnight', 0, 60)];
  const now = new Date('2026-11-01T18:30:00Z');
  assert.deepEqual(
    currentOrNextLessons([row], '2026-11-02', now)?.lessons.map(
      (entry) => entry.id,
    ),
    ['midnight'],
  );
  row.snapshot!.data.lessons = [];
  const empty = currentOrNextLessons([row], '2026-11-02', now)!;
  assert.equal(empty.state, 'none');
  assert.equal(empty.hadLessons, false);
});

test('personal eligibility excludes rooms and lecturers rather than assuming any sole source is personal', () => {
  const now = new Date('2026-11-02T03:30:00Z');
  for (const kind of ['lecturer', 'auditorium'] as const) {
    assert.equal(
      currentOrNextLessons(
        [{ ...schedule, selection: { kind, id: 901, label: 'Источник' } }],
        '2026-11-02',
        now,
      ),
      undefined,
    );
  }
});

test('missing, expired, unresolved subgroup and uncovered document cannot say classes are over', () => {
  const now = new Date('2026-11-02T03:30:00Z');
  assert.equal(
    currentOrNextLessons(
      [{ selection: schedule.selection, error: 'Нет данных' }],
      '2026-11-02',
      now,
    ),
    undefined,
  );
  const expired = structuredClone(schedule);
  expired.snapshot!.checkedAt = '2026-10-30T00:00:00Z';
  expired.snapshot!.expiresAt = '2026-10-30T01:00:00Z';
  assert.equal(currentOrNextLessons([expired], '2026-11-02', now), undefined);
  const unresolved = structuredClone(schedule);
  unresolved.selection = { id: 901, label: 'АБ-101', subgroupNumber: 2 };
  unresolved.snapshot!.data.lessons = [
    { ...lesson('lab', 540, 630), subgroups: [77] },
  ];
  assert.equal(
    currentOrNextLessons([unresolved], '2026-11-02', now),
    undefined,
  );
  const vuc = {
    ...schedule,
    selection: {
      kind: 'vuc' as const,
      id: 'd0123456789ab-p901',
      label: 'ВУЦ 901',
    },
  };
  assert.equal(currentOrNextLessons([vuc], '2026-11-02', now), undefined);
});

test('boundaries, public subgroup filtering, saved data and document coverage retain honest lessons', () => {
  const row = structuredClone(schedule);
  row.snapshot!.data.subgroups = [
    { id: 77, label: 'АБ-101/1' },
    { id: 78, label: 'АБ-101/2' },
  ];
  row.snapshot!.data.lessons = [
    lesson('whole', 540, 630),
    { ...lesson('other', 540, 630), subgroups: [77] },
    { ...lesson('ours', 720, 810), subgroups: [78] },
    { ...lesson('parallel', 720, 800), subgroups: [78] },
  ];
  row.selection = { id: 901, label: 'АБ-101', subgroupNumber: 2 };
  const next = currentOrNextLessons(
    [row],
    '2026-11-02',
    new Date('2026-11-02T04:30:00Z'),
  )!;
  assert.equal(next.state, 'between');
  assert.deepEqual(
    next.lessons.map((entry) => entry.id),
    ['parallel', 'ours'],
  );
  row.snapshot!.stale = true;
  row.error = 'Нет сети';
  const saved = currentOrNextLessons(
    [row],
    '2026-11-02',
    new Date('2026-11-02T03:00:00Z'),
  )!;
  assert.deepEqual(
    saved.lessons.map((entry) => entry.id),
    ['whole'],
  );
  assert.equal(saved.saved, true);
  assert.equal(
    currentOrNextLessons([row], '2026-11-02', new Date('2026-11-02T07:30:00Z'))
      ?.state,
    'none',
  );
  const vuc = {
    ...row,
    selection: {
      kind: 'vuc' as const,
      id: 'd0123456789ab-p901',
      label: 'ВУЦ 901',
    },
  };
  vuc.snapshot!.data.coveredDates = ['2026-11-02'];
  assert.ok(
    currentOrNextLessons([vuc], '2026-11-02', new Date('2026-11-02T03:00:00Z'))
      ?.lessons.length,
  );
  vuc.snapshot!.data.unresolvedDates = ['2026-11-02'];
  assert.equal(
    currentOrNextLessons([vuc], '2026-11-02', new Date('2026-11-02T03:00:00Z')),
    undefined,
  );
});
