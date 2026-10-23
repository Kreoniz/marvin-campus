import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  compareDay,
  comparisonIssue,
  comparisonScope,
  forSelection,
  lessonsFor,
} from './domain.ts';
import { addDays, monday, omskToday } from './dates.ts';
import { parseView, viewURL } from './url.ts';
import type { GroupSchedule, Lesson } from './types.ts';

const date = '2026-10-12';
const lesson = (
  start: number,
  end: number,
  fields: Partial<Lesson> = {},
): Lesson => ({
  id: '1',
  date,
  start,
  end,
  subject: 'Математика',
  kind: 'Лекция',
  building: 'УЛК-1',
  room: '155',
  teacher: '',
  remote: false,
  subgroups: [],
  ...fields,
});
const group = (
  id: number,
  lessons: Lesson[],
  subgroup?: number,
): GroupSchedule => ({
  selection: { id, label: `Г-${id}`, subgroup },
  snapshot: {
    data: { groupId: id, lessons, subgroups: [] },
    checkedAt: '',
    expiresAt: '',
    stale: false,
  },
});

test('presence includes breaks, uses every group, and free time subtracts remote lessons', () => {
  const result = compareDay(
    [
      group(1, [
        lesson(480, 540),
        lesson(720, 780),
        lesson(600, 630, { remote: true }),
      ]),
      group(2, [lesson(510, 570), lesson(750, 810)]),
      group(3, [lesson(540, 600), lesson(690, 750)]),
    ],
    date,
  );
  assert.deepEqual(result.presence, [{ start: 540, end: 750 }]);
  assert.deepEqual(result.free, [{ start: 630, end: 690 }]);
});
test('remote edge lessons do not extend presence; remote-only group prevents presence', () => {
  assert.deepEqual(
    compareDay(
      [
        group(1, [lesson(400, 450, { remote: true }), lesson(600, 660)]),
        group(2, [lesson(500, 700)]),
      ],
      date,
    ).presence,
    [{ start: 600, end: 660 }],
  );
  const remote = lesson(600, 660, { remote: true });
  const result = compareDay([group(1, [remote]), group(2, [remote])], date);
  assert.deepEqual(result.presence, []);
  assert.equal(result.lessons.length, 1);
});
test('touching intervals have no duration; absence differs from a source error', () => {
  assert.deepEqual(
    compareDay(
      [group(1, [lesson(480, 540)]), group(2, [lesson(540, 600)])],
      date,
    ).presence,
    [],
  );
  assert.equal(compareDay([group(1, []), group(2, [])], date).complete, true);
  assert.equal(
    compareDay(
      [
        group(1, []),
        { selection: { id: 2, label: 'Г-2' }, error: 'Unavailable' },
      ],
      date,
    ).complete,
    false,
  );
});
test('a group without onsite lessons prevents common presence for all selected groups', () => {
  const first = group(1, [lesson(580, 885)]);
  const second = group(2, [lesson(480, 1000)]);
  assert.deepEqual(compareDay([first, second], date).presence, [
    { start: 580, end: 885 },
  ]);
  for (const third of [
    group(3, []),
    group(3, [lesson(600, 660, { remote: true })]),
  ]) {
    const result = compareDay([first, second, third], date);
    assert.equal(result.complete, true);
    assert.deepEqual(result.presence, []);
    assert.deepEqual(result.free, []);
  }
});
test('a subgroup preserves group/stream lessons and excludes other subgroups', () => {
  const lessons = [
    lesson(480, 540),
    lesson(600, 660, { subgroups: [10] }),
    lesson(720, 780, { subgroups: [11] }),
  ];
  assert.equal(forSelection(lessons).length, 3);
  assert.deepEqual(
    forSelection(lessons, 10).map((l) => l.start),
    [480, 600],
  );
});

test('unresolved subgroup is excluded, never interpreted as free time', () => {
  const edges = [lesson(480, 540), lesson(720, 780)];
  const unresolved = group(1, [
    ...edges,
    lesson(540, 720, { subgroups: [12] }),
  ]);
  unresolved.selection.subgroupNumber = 2;
  unresolved.snapshot!.data.subgroups = [{ id: 12, label: 'Подгруппа 12' }];
  const second = group(2, edges);
  assert.equal(comparisonIssue(unresolved), 'subgroup');
  assert.deepEqual(lessonsFor(unresolved), edges);
  assert.deepEqual(compareDay([unresolved, second], date), {
    presence: [],
    free: [],
    lessons: [],
    complete: false,
  });
  const third = group(3, edges);
  const scope = comparisonScope([unresolved, second, third]);
  assert.deepEqual(
    scope.included.map((g) => g.selection.id),
    [2, 3],
  );
  assert.deepEqual(
    scope.excluded.map((g) => g.selection.id),
    [1],
  );
  const partial = compareDay([unresolved, second, third], date);
  assert.equal(partial.complete, false);
  assert.deepEqual(partial.presence, [{ start: 480, end: 780 }]);
  assert.deepEqual(partial.free, [{ start: 540, end: 720 }]);
  unresolved.selection.subgroup = 12;
  const resolved = compareDay([unresolved, second, third], date);
  assert.equal(resolved.complete, true);
  assert.deepEqual(resolved.free, []);
});

test('partial comparisons retain valid empty, remote-only and saved schedules', () => {
  const missing: GroupSchedule = {
    selection: { id: 1, label: 'Г-1' },
    error: 'Unavailable',
  };
  const second = group(2, [lesson(480, 540), lesson(720, 780)]);
  const saved = group(3, [lesson(480, 540), lesson(720, 780)]);
  saved.snapshot!.stale = true;
  saved.error = 'Source unavailable';
  assert.deepEqual(compareDay([missing, second, saved], date).free, [
    { start: 540, end: 720 },
  ]);
  for (const fourth of [
    group(4, []),
    group(4, [lesson(600, 660, { remote: true })]),
  ]) {
    assert.equal(
      comparisonScope([missing, second, saved, fourth]).included.length,
      3,
    );
    assert.deepEqual(
      compareDay([missing, second, saved, fourth], date).presence,
      [],
    );
  }
  const empty = group(5, []);
  empty.selection.subgroupNumber = 2;
  assert.equal(comparisonIssue(empty), undefined);
  assert.equal(compareDay([empty, second], date).complete, true);
  empty.selection.subgroup = 12;
  assert.equal(comparisonIssue(empty), undefined);
  assert.equal(empty.selection.subgroupNumber, 2);
  assert.deepEqual(compareDay([missing], date).free, []);
});

test('ambiguous public subgroup identities cannot become a complete comparison', () => {
  const ambiguous = group(1, [lesson(480, 540, { subgroups: [12] })]);
  ambiguous.selection.subgroupNumber = 2;
  ambiguous.snapshot!.data.subgroups = [
    { id: 12, label: 'Г-1/2' },
    { id: 13, label: 'Г-1/2' },
  ];
  assert.equal(comparisonIssue(ambiguous), 'subgroup');
  assert.equal(compareDay([ambiguous, group(2, [])], date).complete, false);
});
test('common events need matching source identity and details across all groups', () => {
  const shared = lesson(480, 540);
  assert.equal(
    compareDay(
      [group(1, [shared]), group(2, [shared]), group(3, [shared])],
      date,
    ).lessons.length,
    1,
  );
  for (const change of [{ id: '2' }, { room: '156' }, { id: '' }])
    assert.equal(
      compareDay(
        [group(1, [shared]), group(2, [lesson(480, 540, change)])],
        date,
      ).lessons.length,
      0,
    );
  assert.equal(
    compareDay([group(1, [shared]), group(2, [shared]), group(3, [])], date)
      .lessons.length,
    0,
  );
});
test('URL round-trip preserves labels, subgroups, date, mode; ignores malformed state', () => {
  const state = {
    groups: [
      { id: 373, label: 'ИВТ-241', subgroup: 596 },
      { id: 374, label: 'ИВТ-242' },
    ],
    week: date,
    day: addDays(date, 2),
    mode: 'free' as const,
  };
  assert.deepEqual(
    parseView(
      viewURL(state, new URL('https://campus.kreoniz.ru')),
      date,
      state.groups,
    ),
    state,
  );
  const invalid = parseView(
    new URL(
      'https://campus.kreoniz.ru?g=nope~X&week=2026-02-30&day=2025-01-01&mode=nope',
    ),
    date,
  );
  assert.deepEqual(invalid, {
    groups: [],
    week: date,
    day: date,
    mode: 'free',
  });
});
test('today and week follow Omsk even when the browser is in another timezone', () => {
  assert.equal(omskToday(new Date('2026-10-11T18:01:00Z')), date);
  assert.equal(monday('2026-10-11'), '2026-10-05');
  assert.equal(addDays('2026-12-28', 6), '2027-01-03');
});

test('selection order survives a shared link', () => {
  const first = group(694, [lesson(480, 600)]),
    second = group(370, [lesson(480, 540)]);
  const state = {
    groups: [first.selection, second.selection],
    week: date,
    day: date,
    mode: 'free' as const,
  };
  assert.deepEqual(
    parseView(
      viewURL(state, new URL('https://campus.kreoniz.ru')),
      date,
      state.groups,
    ).groups.map((g) => g.id),
    state.groups.map((g) => g.id),
  );
});
