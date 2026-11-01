import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useComparison } from '../features/comparison/model/use-comparison.ts';
import { normalizeView, parseView, viewURL, type ViewState } from './url.ts';
import { scheduleKey } from './schedule-ref.ts';
import type { Selection } from './types.ts';

const a = { id: 1, label: 'АБ-123' };
const b = { id: 2, label: 'ВГ-234' };
const c = { id: 3, label: 'ДЕ-345' };
const day = '2026-11-02';

function globalValue(t: TestContext, key: string, value: unknown) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value,
    writable: true,
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, key, previous);
    else Reflect.deleteProperty(globalThis, key);
  });
}

function environment(t: TestContext, saved: Selection[] = [a, b]) {
  const values = new Map([
    ['campus-groups', JSON.stringify(saved)],
    [
      'campus-subgroups',
      JSON.stringify({ 1: [{ id: 11, label: 'АБ-123/2' }] }),
    ],
  ]);
  let location = new URL(`https://campus.example/?g=1~АБ-123&d=${day}`);
  const pushes: { campusView: ViewState }[] = [];
  globalValue(t, 'localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
  globalValue(t, 'location', location);
  const navigate = (url: string | URL) => {
    location = new URL(url, location);
    globalThis.location = location as unknown as Location;
  };
  globalValue(t, 'history', {
    replaceState(_state: unknown, _title: string, url: string | URL) {
      navigate(url);
    },
    pushState(
      state: { campusView: ViewState },
      _title: string,
      url: string | URL,
    ) {
      pushes.push(structuredClone(state));
      navigate(url);
    },
  } as unknown as History);
  const copied: string[] = [];
  globalValue(t, 'navigator', {
    clipboard: {
      writeText: async (text: string) => {
        copied.push(text);
      },
    },
  } as unknown as Navigator);
  t.mock.method(globalThis, 'fetch', async () =>
    assert.fail('no network in navigation probes'),
  );
  function render(path?: string, vucOnly = false) {
    if (path) navigate(path);
    const client = new QueryClient();
    t.after(() => client.clear());
    let result: ReturnType<typeof useComparison>;
    function Probe() {
      result = useComparison(() => {}, vucOnly);
      return null;
    }
    renderToString(
      createElement(QueryClientProvider, { client }, createElement(Probe)),
    );
    return result!;
  }
  return {
    values,
    pushes,
    copied,
    render,
    saved: () => JSON.parse(values.get('campus-groups')!) as Selection[],
  };
}

test('temporary selection, date/mode changes and copying preserve Home workspace', async (t) => {
  const env = environment(t);
  const { view, links } = env.render();
  assert.deepEqual(view.groups, [a]);
  links.canonicalize();
  assert.deepEqual(env.saved(), [a, b]);
  assert.deepEqual(
    view.savedGroups,
    [a, b],
    'highlight pruning retains the saved selection',
  );
  view.selectDate('2026-11-03');
  view.selectWeek('2026-11-09');
  view.selectMode('presence');
  await links.copy();
  assert.equal(env.copied.length, 1);
  assert.deepEqual(env.saved(), [a, b]);
  assert.deepEqual(env.render('/').view.groups, [a, b]);
});

test('repeated active navigation and equal order add no history; edits retain one step', (t) => {
  const env = environment(t);
  const { view } = env.render();
  view.selectDay(day);
  view.selectDate(day);
  view.selectWeek(day);
  view.selectMode('free');
  view.subgroup(scheduleKey(a), undefined);
  view.reorder(view.current().groups);
  assert.equal(env.pushes.length, 0);
  assert.deepEqual(
    env.saved(),
    [a, b],
    'no-op selections do not adopt a temporary view',
  );
  view.selectDay('2026-11-03');
  view.selectDay('2026-11-03');
  assert.equal(env.pushes.length, 1);
  view.selectWeek('2026-11-09');
  view.selectWeek('2026-11-09');
  assert.equal(env.pushes.length, 2);
  view.selectMode('presence');
  view.selectMode('presence');
  assert.equal(env.pushes.length, 3);
  view.subgroup(scheduleKey(a), 11);
  view.subgroup(scheduleKey(a), 11);
  assert.equal(env.pushes.length, 4);
  assert.deepEqual(env.saved(), [{ ...a, subgroup: 11, subgroupNumber: 2 }]);
});

test('subgroup re-selection preserves a saved public number without a catalogue; choosing all adopts it', (t) => {
  const env = environment(t);
  const { view } = env.render();
  view.apply({
    ...view.current(),
    groups: [{ ...a, subgroup: 99, subgroupNumber: 2 }],
  });
  view.subgroup(scheduleKey(a), 99);
  assert.equal(env.pushes.length, 0);
  assert.deepEqual(env.saved(), [a, b]);
  view.apply({ ...view.current(), groups: [{ ...a, subgroupNumber: 2 }] });
  view.subgroup(scheduleKey(a), undefined);
  assert.equal(env.pushes.length, 1);
  assert.deepEqual(env.saved(), [a]);
});

test('typed mixed and legacy payload restoration learns group names without adopting selections', async (t) => {
  const mixed: Selection[] = [
    a,
    { kind: 'lecturer', id: 1, label: 'Учебный преподаватель' },
  ];
  const env = environment(t, mixed);
  const { view, links } = env.render();
  const shared: ViewState = {
    groups: [c, mixed[1]],
    day,
    week: day,
    mode: 'free',
  };
  // Opening typed and legacy links settles through apply + canonicalize.
  for (const value of [
    parseView(viewURL(shared, new URL('https://campus.example/'))),
    normalizeView({ ...shared, groups: [c] }),
  ]) {
    view.apply(value);
    links.canonicalize();
    await links.copy();
    assert.deepEqual(env.saved(), mixed);
  }
  assert.deepEqual(
    env.render('/').view.groups,
    mixed,
    'Home retains every schedule kind',
  );
  assert.equal(
    env.values.get('campus-group-directory')!.includes('ДЕ-345'),
    true,
  );
  assert.equal(
    env.values.get('campus-group-directory')!.includes('преподаватель'),
    false,
  );
});

test('VUC selection edits stay separate from the ordinary saved workspace', async (t) => {
  const env = environment(t);
  const platoon: Selection = { kind: 'vuc', id: 'document-101', label: '101' };
  const saved: Selection[] = [
    { kind: 'vuc', id: 'document-102', label: '102' },
  ];
  env.values.set('campus-vuc-selection', JSON.stringify(saved));
  const { view, links } = env.render(`/?d=${day}`, true);
  view.apply({ ...view.current(), groups: [platoon] });
  view.selectDate('2026-11-03');
  await links.copy();
  assert.deepEqual(JSON.parse(env.values.get('campus-vuc-selection')!), saved);
  view.addSchedule(saved[0]);
  assert.deepEqual(JSON.parse(env.values.get('campus-vuc-selection')!), [
    platoon,
    saved[0],
  ]);
  assert.deepEqual(env.saved(), [a, b]);
  assert.deepEqual(view.savedGroups, [platoon, saved[0]]);
});

test('selection edits adopt the viewed set; replaying history does not re-adopt it', (t) => {
  const env = environment(t);
  const { view, links } = env.render();
  links.canonicalize();
  const original = view.current();
  view.addSchedule(c);
  assert.deepEqual(env.saved(), [a, c]);
  view.reorder([c, a]);
  view.reorder([{ ...c }, { ...a }]);
  assert.equal(
    env.pushes.length,
    2,
    'one committed reorder is one history step',
  );
  // History replay uses the same apply + canonicalize path as popstate.
  for (const previous of [
    original,
    env.pushes[0].campusView,
    env.pushes[1].campusView,
  ]) {
    view.apply(normalizeView(previous));
    links.canonicalize();
    assert.deepEqual(env.saved(), [c, a]);
  }
  assert.equal(env.pushes.length, 2);
  assert.deepEqual(env.render('/').view.groups, [c, a]);
  view.remove(scheduleKey(a));
  assert.deepEqual(env.saved(), [c]);
});
