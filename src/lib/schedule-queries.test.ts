import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { selectionWeekOptions } from './schedule-queries.ts';
import {
  loadResourceWeek,
  loadVucWeek,
  resourceSearchOptions,
  vucSearchOptions,
} from '../features/resources/api.ts';
import type { ResourceRef, VucRef } from './types.ts';
const week = '2026-10-26';
const teacher: ResourceRef = {
  kind: 'lecturer',
  id: 901,
  label: 'Учебный преподаватель',
};
const room: ResourceRef = { kind: 'auditorium', id: 901, label: '201' };
const vuc: VucRef = { kind: 'vuc', id: 'd0123456789ab-p901', label: 'ВУЦ 901' };
const snapshot = (data: unknown) => ({
  data,
  checkedAt: '2026-10-30T00:00:00Z',
  expiresAt: '2026-10-31T00:00:00Z',
  stale: false,
});
const event = {
  id: 'x',
  date: week,
  start: 540,
  end: 630,
  subject: 'Учебный предмет',
  kind: 'Лекция',
  building: 'Корпус',
  room: '201',
  teacher: '',
  remote: false,
  subgroups: [],
};
test('selection fetch keys keep official group, lecturer, room and VUC namespaces separate', () => {
  const options = [
    selectionWeekOptions({ id: 901, label: 'ТСТ-901' }, week),
    selectionWeekOptions(teacher, week),
    selectionWeekOptions(room, week),
    selectionWeekOptions(vuc, week),
  ];
  assert.deepEqual(
    options.map((o) => o.queryKey),
    [
      ['schedule', 901, week],
      ['resource-week', 'lecturer', 901, week],
      ['resource-week', 'auditorium', 901, week],
      ['vuc-week', vuc.id, week],
    ],
  );
  assert.deepEqual(
    options.map((o) => o.networkMode),
    ['offlineFirst', 'always', 'always', 'always'],
  );
});
test('resource responses reject another kind, owner or week instead of becoming an empty timetable', async (t) => {
  let data: unknown = { kind: 'lecturer', id: 901, lessons: [event] };
  const paths: string[] = [];
  t.mock.method(globalThis, 'fetch', async (path: unknown) => {
    paths.push(String(path));
    return Response.json(snapshot(data));
  });
  assert.equal((await loadResourceWeek(teacher, week)).data.id, 901);
  for (const invalid of [
    { kind: 'auditorium', id: 901, lessons: [] },
    { kind: 'lecturer', id: 902, lessons: [] },
    { kind: 'lecturer', id: 901, lessons: [{ ...event, date: '2026-11-02' }] },
    {
      kind: 'lecturer',
      id: 901,
      lessons: [{ ...event, subject: { bad: true } }],
    },
  ]) {
    data = invalid;
    await assert.rejects(loadResourceWeek(teacher, week));
  }
  assert.ok(
    paths.every((path) => path === `/api/resources/lecturer/901?week=${week}`),
  );
});
test('VUC responses retain explicit empty coverage but reject dates outside requested week', async (t) => {
  let data: unknown = {
    kind: 'vuc',
    id: vuc.id,
    lessons: [],
    coveredDates: [],
    unresolvedDates: [],
  };
  t.mock.method(globalThis, 'fetch', async () => Response.json(snapshot(data)));
  assert.deepEqual((await loadVucWeek(vuc, week)).data.coveredDates, []);
  for (const invalid of [
    { kind: 'vuc', id: 'other', lessons: [], coveredDates: [] },
    { kind: 'vuc', id: vuc.id, lessons: [], coveredDates: ['2026-11-02'] },
    {
      kind: 'vuc',
      id: vuc.id,
      lessons: [],
      coveredDates: [],
      unresolvedDates: ['bad'],
    },
  ]) {
    data = invalid;
    await assert.rejects(loadVucWeek(vuc, week));
  }
});
test('unified search never accepts another kind or malformed ref from a category response', async (t) => {
  let body: unknown = snapshot([room]);
  t.mock.method(globalThis, 'fetch', async () => Response.json(body));
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  await assert.rejects(
    client.fetchQuery(resourceSearchOptions('lecturer', 'TEST')),
  );
  body = snapshot([teacher]);
  assert.equal(
    (await client.fetchQuery(resourceSearchOptions('lecturer', 'TEST'))).data
      .length,
    1,
  );
  body = snapshot([{ kind: 'vuc', id: '../bad', label: 'X' }]);
  await assert.rejects(client.fetchQuery(vucSearchOptions('90')));
  client.clear();
});
