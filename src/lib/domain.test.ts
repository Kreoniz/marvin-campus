import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareDay, forSelection, placeLessons } from './domain.ts';
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
test('parallel blocks use thirds and reuse a freed column', () => {
  const items = placeLessons(
    [
      group(1, [lesson(480, 600)]),
      group(2, [lesson(480, 540), lesson(540, 600)]),
      group(3, [lesson(510, 570)]),
    ],
    date,
  );
  assert.ok(items.every((item) => item.columns === 3));
  assert.equal(
    items.filter((i) => i.group.id === 2)[0].column,
    items.filter((i) => i.group.id === 2)[1].column,
  );
  assert.equal(
    placeLessons([group(1, [lesson(480, 540), lesson(540, 600)])], date)[1]
      .columns,
    1,
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

test('selection order determines columns for simultaneous events and survives a shared link', () => {
  const first = group(694, [lesson(480, 600)]),
    second = group(370, [lesson(480, 540)]);
  const columns = (groups: GroupSchedule[]) =>
    placeLessons(groups, date).map(({ group, column }) => [group.id, column]);
  assert.deepEqual(columns([first, second]), [
    [694, 0],
    [370, 1],
  ]);
  assert.deepEqual(columns([second, first]), [
    [370, 0],
    [694, 1],
  ]);
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
