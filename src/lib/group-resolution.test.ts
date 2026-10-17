import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGroupRequests } from './group-resolution.ts';
import { readableGroups } from './url.ts';
import type { Group } from './types.ts';

const requests = (path: string) =>
  readableGroups(new URL(path, 'https://campus.example'))!;
const signal = () => new AbortController().signal;

test('link lookups overlap with a three-request limit and preserve URL order', async () => {
  const pending = new Map<string, (value: Group[]) => void>();
  let active = 0;
  let peak = 0;
  const lookup = (term: string) => {
    active++;
    peak = Math.max(peak, active);
    return new Promise<Group[]>((resolve) => {
      pending.set(term, (value) => {
        active--;
        resolve(value);
      });
    });
  };
  const result = resolveGroupRequests(
    requests('/fit-231-s2+fit-232+mo-231+ivt-233'),
    [],
    lookup,
    signal(),
    true,
  );
  assert.equal(pending.size, 3, 'catalog lookups must start together');
  pending.get('МО-231')!([{ id: 3, label: 'МО-231' }]);
  await Promise.resolve();
  await Promise.resolve();
  assert.ok(pending.has('ИВТ-233'), 'a completed lookup releases the next one');
  pending.get('ИВТ-233')!([{ id: 4, label: 'ИВТ-233' }]);
  pending.get('ФИТ-232')!([{ id: 2, label: 'ФИТ-232' }]);
  pending.get('ФИТ-231')!([{ id: 1, label: 'ФИТ-231' }]);
  assert.deepEqual(await result, [
    { id: 1, label: 'ФИТ-231', subgroupNumber: 2 },
    { id: 2, label: 'ФИТ-232' },
    { id: 3, label: 'МО-231' },
    { id: 4, label: 'ИВТ-233' },
  ]);
  assert.equal(peak, 3);
});

test('known and numeric groups resolve offline without catalog requests', async () => {
  const result = await resolveGroupRequests(
    requests('/fit-231+g7-sid71'),
    [{ id: 1, label: 'ФИТ-231' }],
    async () => assert.fail('offline known groups need no search'),
    signal(),
    false,
  );
  assert.deepEqual(result, [
    { id: 1, label: 'ФИТ-231' },
    { id: 7, label: 'Группа 7', subgroup: 71 },
  ]);
});

test('ambiguous or unavailable directory matches cannot choose an arbitrary group', async () => {
  const duplicate = [
    { id: 1, label: 'ФИТ-231' },
    { id: 2, label: 'ФИТ-231' },
  ];
  for (const known of [duplicate, []]) {
    await assert.rejects(
      resolveGroupRequests(
        requests('/fit-231'),
        known,
        async () => duplicate,
        signal(),
        true,
      ),
      /неоднозначен/,
    );
  }
  await assert.rejects(
    resolveGroupRequests(
      requests('/fit-231'),
      [],
      async () => [],
      signal(),
      true,
    ),
    /не найдена/,
  );
  await assert.rejects(
    resolveGroupRequests(
      requests('/fit-231'),
      [],
      async () => [],
      signal(),
      false,
    ),
    /Нет сети/,
  );
});

test('aborted link resolution stops admitting further searches', async () => {
  const controller = new AbortController();
  const pending: ((groups: Group[]) => void)[] = [];
  const result = resolveGroupRequests(
    requests('/fit-231+fit-232+mo-231+ivt-233'),
    [],
    () => new Promise((resolve) => pending.push(resolve)),
    controller.signal,
    true,
  );
  controller.abort();
  for (const resolve of pending) resolve([]);
  await assert.rejects(result, { name: 'AbortError' });
  assert.equal(pending.length, 3);
});
