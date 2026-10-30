import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scheduleKey,
  selectionKind,
  isGroup,
  validSelection,
} from './schedule-ref.ts';
import { assignColors } from './colors.ts';
import { normalizeView, parseView, viewURL } from './url.ts';
import { compareDay, comparisonIssue, comparisonScope } from './domain.ts';
import { lessonBlocks, eventMemberLessons } from './lesson-layout.ts';
import { dayAgenda } from './agenda.ts';
import { selectedSubgroup } from './subgroups.ts';
import type {
  GroupSchedule,
  Lesson,
  Selection,
  ScheduleData,
  VucRef,
} from './types.ts';

const date = '2026-10-26';
const vucRef: VucRef = {
  kind: 'vuc',
  id: 'd0123456789ab-p901',
  label: 'ВУЦ · взвод 901',
  firstDate: '2025-09-01',
  lastDate: '2025-10-06',
};
const refs: Selection[] = [
  { id: 901, label: 'ТСТ-901', subgroupNumber: 2 },
  { kind: 'lecturer', id: 901, label: 'Учебный преподаватель' },
  { kind: 'auditorium', id: 901, label: '8-201' },
  vucRef,
];
const lesson = (
  id: string,
  start = 540,
  end = 630,
  extra: Partial<Lesson> = {},
): Lesson => ({
  id,
  date,
  start,
  end,
  subject: 'Учебный предмет',
  kind: 'Лекция',
  building: 'Корпус',
  room: '201',
  teacher: '',
  remote: false,
  subgroups: [],
  ...extra,
});
const schedule = (
  selection: Selection,
  lessons: Lesson[],
  extra: Partial<ScheduleData> = {},
): GroupSchedule => ({
  selection,
  snapshot: {
    data: { lessons, subgroups: [], ...extra },
    checkedAt: '2026-10-30T00:00:00Z',
    expiresAt: '2026-10-31T00:00:00Z',
    stale: false,
  },
});

test('typed canonical identities keep equal source IDs independent across kinds and documents', () => {
  assert.deepEqual(refs.map(scheduleKey), [
    'rasp:group:901',
    'rasp:lecturer:901',
    'rasp:auditorium:901',
    'vuc:platoon:d0123456789ab-p901',
  ]);
  assert.equal(selectionKind(refs[0]), 'group');
  assert.ok(isGroup(refs[0]));
  assert.equal(isGroup(refs[1]), false);
  const keys = refs.map(scheduleKey);
  const colors = assignColors(keys);
  assert.equal(new Set(Object.values(colors)).size, 4);
  assert.deepEqual(
    assignColors([...keys].reverse(), colors),
    Object.fromEntries([...keys].reverse().map((key) => [key, colors[key]])),
  );
  assert.notEqual(
    scheduleKey(refs[3]),
    scheduleKey({ ...vucRef, id: 'dffffffffffff-p901' }),
  );
  assert.equal(
    selectedSubgroup(refs[1], [{ id: 1, label: 'ТСТ-901/1' }]),
    undefined,
  );
});
test('mixed comparison URLs and history preserve kind, identity, order, labels and group scope', () => {
  const state = { groups: refs, week: date, day: date, mode: 'free' as const };
  const url = viewURL(state, new URL('https://campus.example/'));
  assert.equal(url.pathname, '/compare');
  const parsed = parseView(url, '2026-10-30');
  assert.deepEqual(parsed, state);
  assert.deepEqual(normalizeView(parsed), state);
  const back = normalizeView({
    ...parsed,
    groups: [
      parsed.groups[2],
      parsed.groups[0],
      parsed.groups[3],
      parsed.groups[1],
    ],
  });
  assert.deepEqual(back.groups.map(scheduleKey), [
    scheduleKey(refs[2]),
    scheduleKey(refs[0]),
    scheduleKey(refs[3]),
    scheduleKey(refs[1]),
  ]);
  const old = viewURL(
    { ...state, groups: [refs[0]] },
    new URL('https://campus.example/'),
  );
  assert.equal(old.pathname, '/~t_s_t-901-s2');
});
test('malformed mixed selections cannot turn into another kind or broader subgroup', () => {
  for (const invalid of [
    { kind: 'student', id: 1, label: 'X' },
    { kind: 'lecturer', id: 1, label: 'X', description: [{}] },
    {
      kind: 'vuc',
      id: 'document-p1',
      label: 'X',
      firstDate: { value: '2026-10-01' },
    },
    { kind: 'lecturer', id: -1, label: 'X' },
    { kind: 'lecturer', source: 'vuc', id: 901, label: 'X' },
    { kind: 'vuc', id: '../../data', label: 'X' },
    { kind: 'vuc', id: 'UPPER', label: 'X' },
    { kind: 'group', id: 1, label: 'X', subgroup: 'bad' },
    { kind: 'auditorium', id: 901, label: 'X', subgroup: 1 },
  ]) {
    assert.equal(validSelection(invalid), false);
    const url = new URL('https://campus.example/compare');
    url.searchParams.append('s', JSON.stringify(refs[0]));
    url.searchParams.append('s', JSON.stringify(invalid));
    assert.deepEqual(parseView(url).groups, []);
  }
  const url = viewURL(
    { groups: refs, week: date, day: date, mode: 'presence' },
    new URL('https://campus.example/'),
  );
  url.searchParams.append('s', JSON.stringify(refs[1]));
  assert.equal(parseView(url).groups.length, 4);
});
test('rooms are overlays and do not invent presence or reduce people comparison completeness', () => {
  const people = [
    schedule({ id: 1, label: 'ТСТ-1' }, [
      lesson('first', 540, 600),
      lesson('last', 720, 780),
    ]),
    schedule({ kind: 'lecturer', id: 1, label: 'Учебный преподаватель' }, [
      lesson('second', 570, 630),
      lesson('last-two', 750, 810),
    ]),
  ];
  const expected = compareDay(people, date);
  const room = schedule({ kind: 'auditorium', id: 1, label: '101' }, [
    lesson('occupied', 630, 750),
  ]);
  const missing = {
    selection: { kind: 'auditorium' as const, id: 2, label: '102' },
    error: 'Нет сети',
  };
  assert.deepEqual(compareDay([...people, room, missing], date), expected);
  assert.equal(expected.complete, true);
  assert.deepEqual(expected.presence, [{ start: 570, end: 780 }]);
  assert.deepEqual(expected.free, [{ start: 630, end: 720 }]);
  assert.equal(comparisonIssue(missing, date), 'missing');
  assert.equal(
    comparisonScope([...people, room, missing], date).overlays.length,
    2,
  );
  assert.equal(compareDay([people[0], room], date).presence.length, 0);
  assert.equal(compareDay([room, missing], date).presence.length, 0);
});
test('VUC coverage belongs to each platoon/date and unknown or ambiguous rows never become empty days', () => {
  const group = schedule({ id: 1, label: 'ТСТ-1' }, [
    lesson('first', 540, 600),
    lesson('last', 720, 780),
  ]);
  const vuc = schedule(
    refs[3],
    [lesson('vuc', 570, 750, { source: 'vuc:doc' })],
    { coveredDates: [date], unresolvedDates: ['2026-10-29'] },
  );
  assert.equal(comparisonIssue(vuc, date), undefined);
  assert.equal(compareDay([group, vuc], date).complete, true);
  for (const day of ['2026-10-27', '2026-10-29']) {
    assert.equal(comparisonIssue(vuc, day), 'coverage');
    assert.deepEqual(compareDay([group, vuc], day), {
      presence: [],
      free: [],
      lessons: [],
      complete: false,
    });
  }
  const other = schedule({ ...vucRef, id: 'd0123456789ab-p902' }, [], {
    coveredDates: [],
  });
  assert.equal(comparisonIssue(other, date), 'coverage');
  const ambiguous = schedule(
    refs[3],
    [lesson('known', 570, 750, { date: '2026-10-29', source: 'vuc:doc' })],
    { coveredDates: [], unresolvedDates: ['2026-10-29'] },
  );
  assert.equal(dayAgenda([ambiguous], '2026-10-29').length, 1);
  assert.equal(
    comparisonScope([group, ambiguous], '2026-10-29').excluded.length,
    1,
  );
});
test('official group, lecturer and room projections share one verified event without losing metadata', () => {
  const teacher = {
    kind: 'lecturer' as const,
    id: 901,
    label: 'Учебный преподаватель',
  };
  const room = { kind: 'auditorium' as const, id: 901, label: '201' };
  const schedules = [
    schedule(refs[0], [lesson('same')]),
    schedule(refs[1], [
      lesson('same', 540, 630, {
        teachers: [teacher],
        roomRef: room,
        audience: 'ТСТ-901',
      }),
    ]),
    schedule(refs[2], [
      lesson('same', 540, 630, {
        teacher: 'Учебный преподаватель',
        teachers: [teacher],
        roomRef: room,
        audience: 'ТСТ-901, ТСТ-902',
      }),
    ]),
  ];
  const blocks = lessonBlocks(schedules, date);
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].members.length, 3);
  assert.equal(Object.keys(blocks[0].memberLessons).length, 3);
  assert.deepEqual(blocks[0].lesson.teachers, [teacher]);
  assert.deepEqual(blocks[0].lesson.roomRef, room);
  assert.ok(blocks[0].lesson.audiences?.includes('ТСТ-901, ТСТ-902'));
  for (const ref of refs.slice(0, 3))
    assert.equal(
      eventMemberLessons(blocks[0], scheduleKey(ref), blocks[0].lesson).length,
      1,
    );
  assert.deepEqual(lessonBlocks([...schedules].reverse(), date), blocks);
  const imported = schedule(
    refs[3],
    [lesson('same', 540, 630, { source: 'vuc:document' })],
    { coveredDates: [date] },
  );
  assert.equal(lessonBlocks([...schedules, imported], date).length, 2);
});
test('conflicting canonical room identities remain explicit rather than linking an arbitrary source', () => {
  const a = schedule({ id: 1, label: 'ТСТ-1' }, [
    lesson('same', 540, 630, {
      roomRef: { kind: 'auditorium', id: 1, label: '201' },
    }),
  ]);
  const b = schedule(
    { kind: 'lecturer', id: 1, label: 'Учебный преподаватель' },
    [
      lesson('same', 540, 630, {
        roomRef: { kind: 'auditorium', id: 2, label: '201' },
      }),
    ],
  );
  const block = lessonBlocks([a, b], date)[0];
  assert.equal(block.lesson.roomRef, undefined);
  assert.ok(block.lesson.metadataWarnings?.length);
  assert.equal(block.memberLessons[scheduleKey(a.selection)][0].roomRef?.id, 1);
  assert.equal(block.memberLessons[scheduleKey(b.selection)][0].roomRef?.id, 2);
});

test('VUC cadence survives local history without inflating shared URLs or authorizing coverage', () => {
  const selection = { ...vucRef, coveredDates: ['2025-09-01', '2025-09-08'] };
  const state = {
    groups: [selection],
    week: '2025-09-01',
    day: '2025-09-01',
    mode: 'free' as const,
  };
  assert.deepEqual(normalizeView(state).groups, [selection]);
  const url = viewURL(state, new URL('https://campus.example/'));
  assert.equal(url.search.includes('coveredDates'), false);
  assert.deepEqual(parseView(url).groups, [vucRef]);
  const item = schedule(selection, [], {});
  assert.equal(comparisonIssue(item, '2025-09-01'), 'coverage');
});

test('legacy numeric group member order stays numeric after typed-key migration', () => {
  const block = lessonBlocks(
    [
      schedule({ id: 10, label: 'ТСТ-10' }, [lesson('same')]),
      schedule({ id: 2, label: 'ТСТ-2' }, [lesson('same')]),
    ],
    date,
  )[0];
  assert.deepEqual(
    block.members.map((member) => member.id),
    [2, 10],
  );
});

test('persisted mixed selection never contaminates the academic group directory', async () => {
  const { rememberGroups, knownGroups } = await import('./group-directory.ts');
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  try {
    rememberGroups(refs);
    assert.deepEqual(
      knownGroups().map((group) => ({ id: group.id, label: group.label })),
      [{ id: 901, label: 'ТСТ-901' }],
    );
    const persisted = JSON.parse(values.get('campus-groups')!);
    assert.deepEqual(
      normalizeView({
        groups: persisted,
        week: date,
        day: date,
        mode: 'free',
      }).groups.map(scheduleKey),
      refs.map(scheduleKey),
    );
    assert.equal(
      values.get('campus-group-directory')!.includes('Учебный преподаватель'),
      false,
    );
  } finally {
    if (saved) Object.defineProperty(globalThis, 'localStorage', saved);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('mixed links preserve eight-digit subgroup IDs independently of resource-ID bounds', () => {
  const selection = { id: 901, label: 'ТСТ-901', subgroup: 22000001 };
  const state = {
    groups: [selection, refs[1]],
    week: date,
    day: date,
    mode: 'free' as const,
  };
  assert.equal(validSelection(selection), true);
  assert.deepEqual(
    parseView(viewURL(state, new URL('https://campus.example/'))).groups,
    state.groups,
  );
  assert.deepEqual(normalizeView(state).groups, state.groups);
});
