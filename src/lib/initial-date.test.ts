import test from 'node:test';
import assert from 'node:assert/strict';
import { implicitDateOpening, nextInitialDay } from './initial-date.ts';
import { parseView } from './url.ts';
import type { GroupSchedule, Lesson, Selection } from './types.ts';

const date = '2026-10-30';
const at = (day = date, time = '15:00:00') =>
  Date.parse(`${day}T${time}+06:00`);
const lesson = (extra: Partial<Lesson> = {}): Lesson => ({
  id: 'lesson',
  date,
  start: 600,
  end: 900,
  subject: 'Занятие',
  kind: 'Лек',
  building: '',
  room: '',
  teacher: '',
  remote: false,
  subgroups: [],
  ...extra,
});
function schedule(
  lessons: Lesson[] = [lesson()],
  selection: Selection = { id: 1, label: 'ТЕСТ-101' },
): GroupSchedule {
  return {
    selection,
    snapshot: {
      data: { lessons, subgroups: [] },
      checkedAt: new Date(at()).toISOString(),
      expiresAt: new Date(at() + 30 * 60_000).toISOString(),
      stale: false,
    },
  };
}

test('only original implicit workspace openings qualify, including invalid explicit dates', () => {
  for (const path of ['/', '/vuc', '/?v=presence'])
    assert.equal(
      implicitDateOpening(
        new URL(path, 'https://campus.example'),
        new Date(at()),
      ),
      at(),
    );
  for (const path of [
    '/?d=2026-10-30',
    '/?day=2026-10-30',
    '/?week=2026-10-26',
    '/?d=',
    '/?d=invalid',
    '/?week=invalid',
    '/?g=1~ТЕСТ-101',
    '/test-101',
    '/g1',
    '/compare',
    '/vuc?s=invalid',
    '/s/AbCd1234_-56',
  ])
    assert.equal(
      implicitDateOpening(
        new URL(path, 'https://campus.example'),
        new Date(at()),
      ),
      undefined,
      path,
    );
});

test('end boundary is inclusive in Omsk, regardless of machine/UTC date', () => {
  const row = schedule();
  assert.equal(nextInitialDay([row], at(date, '14:59:59'), at()), undefined);
  assert.equal(nextInitialDay([row], at(), at()), '2026-10-31');
  assert.equal(
    nextInitialDay([row], at(date, '15:00:01'), at(date, '15:00:01')),
    '2026-10-31',
  );
  const early = schedule([lesson({ end: 30, start: 0 })]);
  early.snapshot!.checkedAt = new Date(at(date, '00:30:00')).toISOString();
  early.snapshot!.expiresAt = new Date(at(date, '01:00:00')).toISOString();
  assert.equal(
    new Date(at(date, '00:30:00')).toISOString().slice(0, 10),
    '2026-10-29',
  );
  assert.equal(
    nextInitialDay([early], at(date, '00:30:00'), at(date, '00:30:00')),
    '2026-10-31',
  );
});

test('a later remote lesson or room overlay prevents early advancement', () => {
  for (const selection of [
    { id: 2, label: 'ТЕСТ-102' },
    { kind: 'lecturer', id: 1, label: 'Преподаватель' },
    { kind: 'auditorium', id: 1, label: 'Аудитория' },
  ] satisfies Selection[]) {
    const later = schedule([lesson({ end: 1000, remote: true })], selection);
    assert.equal(nextInitialDay([schedule(), later], at(), at()), undefined);
    later.snapshot!.data.lessons[0].end = 900;
    assert.equal(nextInitialDay([schedule(), later], at(), at()), '2026-10-31');
  }
});

test('an empty selection/day/week cannot be mistaken for all-finished evidence', () => {
  for (const rows of [
    [],
    [schedule([])],
    [schedule([lesson({ date: '2026-10-29' })])],
  ])
    assert.equal(nextInitialDay(rows, at(), at()), undefined);
  assert.equal(
    nextInitialDay([schedule(), schedule([])], at(), at()),
    '2026-10-31',
  );
});

test('every selected source must settle with usable data and without an error', () => {
  for (const bad of [
    { ...schedule(), snapshot: undefined },
    { ...schedule(), loading: true },
    { ...schedule(), fetching: true },
    { ...schedule(), error: 'Недоступно' },
  ])
    assert.equal(nextInitialDay([schedule(), bad], at(), at()), undefined);
  const expired = schedule();
  expired.snapshot!.checkedAt = '2026-10-28T00:00:00Z';
  expired.snapshot!.expiresAt = '2026-10-28T00:30:00Z';
  assert.equal(nextInitialDay([schedule(), expired], at(), at()), undefined);
  // Saved data within the existing usable grace stays valid; a failed refresh
  // is still blocked above even when the same snapshot remains visible.
  const saved = schedule();
  saved.snapshot!.stale = true;
  assert.equal(nextInitialDay([saved], at(), at()), '2026-10-31');
  const boundary = schedule();
  boundary.snapshot!.checkedAt = new Date(
    at() - 24 * 60 * 60_000 - 30 * 60_000,
  ).toISOString();
  boundary.snapshot!.expiresAt = new Date(
    at() - 24 * 60 * 60_000,
  ).toISOString();
  assert.equal(nextInitialDay([boundary], at(), at()), '2026-10-31');
  assert.equal(nextInitialDay([boundary], at(), at() + 1), undefined);
});

test('VUC needs same-day resolved coverage from its response, not stored selection bounds', () => {
  const vuc = schedule([lesson()], {
    kind: 'vuc',
    id: 'daaaaaaaaaaaa-p101',
    label: 'ВУЦ 101',
    coveredDates: [date],
    firstDate: date,
    lastDate: date,
  });
  assert.equal(nextInitialDay([schedule(), vuc], at(), at()), undefined);
  vuc.snapshot!.data.coveredDates = ['2026-10-29'];
  assert.equal(nextInitialDay([schedule(), vuc], at(), at()), undefined);
  vuc.snapshot!.data.coveredDates = [date];
  vuc.snapshot!.data.unresolvedDates = [date];
  assert.equal(nextInitialDay([schedule(), vuc], at(), at()), undefined);
  vuc.snapshot!.data.unresolvedDates = [];
  assert.equal(nextInitialDay([schedule(), vuc], at(), at()), '2026-10-31');
});

test('subgroup filters retain whole-group lessons and cannot hide unresolved data', () => {
  const row = schedule([lesson(), lesson({ end: 1000, subgroups: [2] })], {
    id: 1,
    label: 'ТЕСТ-101',
    subgroupNumber: 1,
  });
  assert.equal(nextInitialDay([row], at(), at()), undefined);
  row.snapshot!.data.subgroups = [
    { id: 1, label: 'ТЕСТ-101/1' },
    { id: 2, label: 'ТЕСТ-101/2' },
  ];
  assert.equal(nextInitialDay([row], at(), at()), '2026-10-31');
  row.selection = { id: 1, label: 'ТЕСТ-101', subgroup: 999 };
  assert.equal(nextInitialDay([row], at(), at()), undefined);
});

test('next calendar day preserves Saturday to Sunday, month, year and leap boundaries', () => {
  for (const [day, next] of [
    ['2026-10-31', '2026-11-01'],
    ['2026-12-31', '2027-01-01'],
    ['2028-02-28', '2028-02-29'],
    ['2028-02-29', '2028-03-01'],
    ['2026-11-02', '2026-11-03'],
  ]) {
    const row = schedule([lesson({ date: day })]);
    row.snapshot!.checkedAt = new Date(at(day)).toISOString();
    row.snapshot!.expiresAt = new Date(at(day) + 30 * 60_000).toISOString();
    assert.equal(nextInitialDay([row], at(day), at(day)), next);
  }
});

test('Sunday still defaults to Monday without requiring Sunday data', () => {
  const now = new Date(at('2026-11-01'));
  const url = new URL('https://campus.example/');
  assert.equal(implicitDateOpening(url, now), undefined);
  assert.equal(parseView(url, '2026-11-01').day, '2026-11-02');
});

test('delayed data uses opening time, and crossing Omsk midnight cancels the decision', () => {
  const rows = [schedule()];
  assert.equal(
    nextInitialDay(rows, at(date, '14:59:00'), at(date, '15:01:00')),
    undefined,
  );
  assert.equal(
    nextInitialDay(rows, at(date, '23:59:00'), at('2026-10-31', '00:00:00')),
    undefined,
  );
  assert.equal(
    nextInitialDay(rows, at(date, '23:59:00'), at(date, '23:59:59')),
    '2026-10-31',
  );
});
