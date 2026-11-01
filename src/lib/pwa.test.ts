import test from 'node:test';
import assert from 'node:assert/strict';
import { renderServiceWorker } from '../../pwa-build.ts';
import { runInNewContext } from 'node:vm';
import { readSavedSchedule } from './saved-schedules.ts';
import type { Selection } from './types.ts';
import {
  readSavedScheduleState,
  savedSchedulePath,
} from './saved-schedules.ts';
import {
  PUBLIC_BODY_LIMIT,
  PUBLIC_DATA_CACHE,
  publicSnapshotDeadline,
} from './public-cache.js';
import { snapshotDeadline } from './cache-policy.ts';
import { handoffPwaResponse } from './pwa.ts';
import { QueryClient } from '@tanstack/react-query';
import {
  loadResourceWeek,
  loadVucWeek,
  vucSearchOptions,
} from '../features/resources/api.ts';
import { parseView, viewURL } from './url.ts';
import { comparisonIssue } from './domain.ts';

function worker(
  build = 'test',
  assets = ['/', '/assets/app.js'],
  stores = new Map<string, Map<string, Response>>(),
) {
  const handlers: Record<string, (event: any) => void> = {};
  let network: () => Promise<Response> = async () => {
    throw new TypeError('offline');
  };
  const context: any = {
    URL,
    TextEncoder,
    TextDecoder,
    Response,
    Date,
    __CAMPUS_BUILD__: build,
    __CAMPUS_ASSETS__: assets,
    self: {
      location: { origin: 'https://campus.example' },
      clients: { claim: async () => {} },
      addEventListener: (name: string, fn: any) => (handlers[name] = fn),
    },
    fetch: () => network(),
    caches: {
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name),
      open: async (name: string) => {
        const data = stores.get(name) ?? new Map<string, Response>();
        stores.set(name, data);
        return {
          put: async (key: string, response: Response) =>
            data.set(
              new URL(key, 'https://campus.example').href,
              response.clone(),
            ),
          match: async (key: string) =>
            data.get(new URL(key, 'https://campus.example').href)?.clone(),
          keys: async () => [...data.keys()],
          delete: async (key: string) => data.delete(key),
        };
      },
    },
  };
  runInNewContext(renderServiceWorker(build, assets), context);
  return {
    context,
    handlers,
    network: (fn: () => Promise<Response>) => (network = fn),
  };
}
const key = 'https://campus.example/api/schedule/370?week=2026-10-12';
const request = new Request(key);
function snapshot(expiresAt = new Date(Date.now() + 600_000).toISOString()) {
  return {
    data: {
      groupId: 370,
      lessons: [
        {
          id: 'lesson',
          date: '2026-10-12',
          subject: 'Subject',
          teacher: '',
          room: '',
          kind: '',
          building: '',
          remote: false,
          subgroups: [],
          start: 540,
          end: 630,
        },
      ],
      subgroups: [],
    },
    checkedAt: new Date().toISOString(),
    expiresAt,
    stale: false,
  };
}

test('offline snapshots are labelled and retain the server timestamp/deadline', async () => {
  const w = worker(),
    body = snapshot();
  w.network(async () => Response.json(body));
  assert.equal((await w.context.networkData(request, key)).status, 200);
  w.network(async () => {
    throw new TypeError('offline');
  });
  const cached = await (await w.context.networkData(request, key)).json();
  assert.equal(cached.stale, true);
  assert.equal(cached.checkedAt, body.checkedAt);
  assert.equal(cached.expiresAt, body.expiresAt);
  assert.match(cached.warning, /Нет сети/);
});
test('delayed handoffs retain a newer observation and equal-time original freshness', async () => {
  const w = worker();
  const newer = snapshot();
  const older = {
    ...newer,
    checkedAt: new Date(Date.parse(newer.checkedAt) - 10000).toISOString(),
    data: { ...newer.data, lessons: [] },
  };
  await w.context.saveData(key, newer);
  await w.context.saveData(key, older);
  assert.deepEqual(
    await (
      await (await w.context.caches.open(PUBLIC_DATA_CACHE)).match(key)
    ).json(),
    newer,
  );
  await w.context.saveData(key, {
    ...newer,
    stale: true,
    warning: 'Нет сети.',
  });
  assert.deepEqual(
    await (
      await (await w.context.caches.open(PUBLIC_DATA_CACHE)).match(key)
    ).json(),
    newer,
  );
  await (
    await w.context.caches.open(PUBLIC_DATA_CACHE)
  ).put(key, Response.json({ broken: true }));
  assert.equal(await w.context.saveData(key, older), true);
  assert.deepEqual(
    await (
      await (await w.context.caches.open(PUBLIC_DATA_CACHE)).match(key)
    ).json(),
    older,
  );
});
test('HTTP failures and cancellation are not silently replaced by cached success', async () => {
  const w = worker();
  await w.context.saveData(key, snapshot());
  for (const status of [429, 502, 503]) {
    w.network(async () =>
      Response.json({ error: 'refresh failed' }, { status }),
    );
    assert.equal((await w.context.networkData(request, key)).status, status);
  }
  const controller = new AbortController();
  controller.abort();
  w.network(async () => {
    throw new Error('cancelled');
  });
  await assert.rejects(
    w.context.networkData(new Request(key, { signal: controller.signal }), key),
    /cancelled/,
  );
});

test('the page can restore the saved schedule while its ordinary network request is still pending', async () => {
  const w = worker();
  const saved = snapshot();
  await w.context.saveData(key, saved);
  let finish!: (response: Response) => void;
  w.network(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const network = w.context.networkData(request, key);
  const restored = await readSavedSchedule(370, '2026-10-12', w.context.caches);
  assert.deepEqual(restored, saved);
  finish(Response.json({ error: 'refresh failed' }, { status: 503 }));
  assert.equal((await network).status, 503);
  assert.deepEqual(
    await readSavedSchedule(370, '2026-10-12', w.context.caches),
    saved,
  );
});
test('unknown and expired offline data are errors; refresh replaces the same key', async () => {
  const w = worker();
  assert.equal((await w.context.networkData(request, key)).status, 503);
  await w.context.saveData(
    key,
    snapshot(new Date(Date.now() - 86_400_001).toISOString()),
  );
  assert.equal((await w.context.networkData(request, key)).status, 503);
  const refreshed = snapshot();
  const refreshedKey = w.context.dataKey(new URL(key + '&refresh=1'));
  assert.equal(refreshedKey, key);
  w.network(async () => Response.json(refreshed));
  await w.context.networkData(new Request(key + '&refresh=1'), refreshedKey);
  w.network(async () => {
    throw new TypeError('offline');
  });
  assert.equal((await w.context.networkData(request, key)).status, 200);
});
test('worker excludes analytics, writes, search and config; data storage is bounded', async () => {
  const w = worker();
  for (const url of [
    'https://stats.example/api/send',
    'https://campus.example/api/config',
    'https://campus.example/api/groups?term=ИВТ',
    'https://campus.example/api/vuc/document-p101/original',
    'https://campus.example/api/attendance',
    'https://campus.example/api/resources/lecturer?term=example',
    'https://campus.example/api/vuc?term=example',
  ]) {
    let intercepted = false;
    w.handlers.fetch({
      request: new Request(url),
      respondWith: () => (intercepted = true),
    });
    assert.equal(intercepted, false);
  }
  let intercepted = false;
  w.handlers.fetch({
    request: new Request('https://campus.example/api/share', {
      method: 'POST',
    }),
    respondWith: () => (intercepted = true),
  });
  assert.equal(intercepted, false);
  await Promise.all(
    Array.from({ length: 105 }, (_, index) => {
      const id = index + 1;
      return w.context.saveData(key.replace('/370?', `/${id}?`), {
        ...snapshot(),
        data: { ...snapshot().data, groupId: id },
      });
    }),
  );
  assert.equal(
    (await (await w.context.caches.open(PUBLIC_DATA_CACHE)).keys()).length,
    100,
  );
  assert.equal(
    (await readSavedScheduleState(1, '2026-10-12', w.context.caches)).offline
      .status,
    'missing',
  );
  assert.equal(
    (await readSavedScheduleState(105, '2026-10-12', w.context.caches)).offline
      .status,
    'available',
  );
  assert.equal(
    (
      await w.context.networkData(
        new Request(key.replace('/370?', '/1?')),
        key.replace('/370?', '/1?'),
      )
    ).status,
    503,
  );
  assert.equal(
    (
      await w.context.networkData(
        new Request(key.replace('/370?', '/105?')),
        key.replace('/370?', '/105?'),
      )
    ).status,
    200,
  );
});

test('readable comparisons and old short links use the offline app shell', async () => {
  const w = worker();
  const cache = await w.context.caches.open('campus-shell-test');
  await cache.put('/', new Response('app shell'));
  for (const path of [
    '/fit-232-s2+ivt-233?d=2026-10-18&v=free',
    '/~yu-232-s2+~y_u-232+~lf_li_lt-232?d=2026-10-18&v=free',
    '/g694-sid1111',
    '/vuc?s=%7B%22kind%22%3A%22vuc%22%2C%22id%22%3A%22daaaaaaaaaaaa-p101%22%7D',
    '/compare?s=%7B%22kind%22%3A%22lecturer%22%2C%22id%22%3A901%7D',
    '/s/AbCd1234_-56',
  ]) {
    let response: Promise<Response> | undefined;
    w.handlers.fetch({
      request: {
        method: 'GET',
        mode: 'navigate',
        url: 'https://campus.example' + path,
      },
      respondWith: (value: Promise<Response>) => {
        response = value;
      },
    });
    assert.ok(response);
    assert.equal(await (await response).text(), 'app shell');
  }
});

function intercepted(w: ReturnType<typeof worker>, path: string) {
  let response: Promise<Response> | undefined;
  w.handlers.fetch({
    request: new Request('https://campus.example' + path),
    respondWith: (value: Promise<Response>) => {
      response = value;
    },
  });
  return response;
}
test('public lecturer, auditorium and VUC weeks reach the persistent worker route', () => {
  const w = worker();
  for (const path of [
    '/api/resources/lecturer/370?week=2026-10-12',
    '/api/resources/auditorium/370?week=2026-10-12',
    '/api/vuc/document-p101?week=2026-10-12',
  ]) {
    assert.ok(
      w.context.dataKey(new URL('https://campus.example' + path)),
      path,
    );
  }
});
test('a second old client can load its unrequested lazy chunk after a new worker activates', async () => {
  const stores = new Map<string, Map<string, Response>>();
  const old = worker('old', ['/', '/assets/lazy-old.js'], stores);
  await (
    await old.context.caches.open('campus-shell-old')
  ).put('/', new Response('old HTML'));
  await (
    await old.context.caches.open('campus-shell-old')
  ).put('/assets/lazy-old.js', new Response('old lazy code'));
  const next = worker('next', ['/', '/assets/lazy-next.js'], stores);
  await next.context.caches.open('campus-shell-next');
  let activation: Promise<void> | undefined;
  next.handlers.activate({
    waitUntil: (value: Promise<void>) => {
      activation = value;
    },
  });
  await activation;
  next.network(
    async () =>
      new Response('asset removed from new deployment', { status: 404 }),
  );
  const oldChunk = intercepted(next, '/assets/lazy-old.js');
  assert.ok(
    oldChunk,
    'new worker must route assets belonging to the previous build',
  );
  assert.equal(await (await oldChunk).text(), 'old lazy code');
});

const refs: Selection[] = [
  { id: 370, label: 'Group' },
  { kind: 'lecturer', id: 370, label: 'Lecturer' },
  { kind: 'auditorium', id: 370, label: 'Room' },
  { kind: 'vuc', id: 'document-p101', label: 'Platoon' },
];
function typedSnapshot(ref: Selection) {
  const base = snapshot();
  return ref.kind === 'vuc'
    ? {
        ...base,
        data: {
          kind: ref.kind,
          id: ref.id,
          lessons: [],
          coveredDates: ['2026-10-12'],
          unresolvedDates: ['2026-10-13'],
        },
      }
    : ref.kind
      ? { ...base, data: { kind: ref.kind, id: ref.id, lessons: [] } }
      : base;
}

function pathKey(ref: Selection) {
  return 'https://campus.example' + savedSchedulePath(ref, '2026-10-12');
}
test('typed first-uncontrolled-page handoff survives a cold worker/page reopen, including successful empty weeks', async () => {
  const stores = new Map<string, Map<string, Response>>();
  const first = worker('first', undefined, stores);
  let ready!: (registration: Pick<ServiceWorkerRegistration, 'active'>) => void;
  const registration = new Promise<Pick<ServiceWorkerRegistration, 'active'>>(
    (resolve) => {
      ready = resolve;
    },
  );
  // Deliberately hold registration until all foreground responses have arrived.
  const saved = refs.map((ref) =>
    handoffPwaResponse(
      registration,
      savedSchedulePath(ref, '2026-10-12'),
      typedSnapshot(ref),
    ),
  );
  ready({
    active: {
      postMessage: (data: unknown, ports: MessagePort[]) => {
        first.handlers.message({
          data,
          ports,
          waitUntil: (value: Promise<unknown>) => void value,
        });
      },
    },
  } as unknown as Pick<ServiceWorkerRegistration, 'active'>);
  assert.deepEqual(await Promise.all(saved), [true, true, true, true]);
  const reopened = worker('first', undefined, stores);
  for (const ref of refs) {
    const result = await intercepted(
      reopened,
      savedSchedulePath(ref, '2026-10-12'),
    );
    assert.equal(result?.status, 200, JSON.stringify(ref));
    const state = await readSavedScheduleState(
      ref,
      '2026-10-12',
      reopened.context.caches,
    );
    assert.equal(state.offline.status, 'available');
    assert.equal(state.snapshot?.checkedAt, (await result!.json()).checkedAt);
    assert.equal(state.snapshot?.data.lessons.length, ref.kind ? 0 : 1);
    if (ref.kind === 'vuc') {
      assert.deepEqual(state.snapshot?.data.coveredDates, ['2026-10-12']);
      assert.equal(
        comparisonIssue(
          { selection: ref, snapshot: state.snapshot },
          '2026-10-12',
        ),
        undefined,
      );
      assert.equal(
        comparisonIssue(
          { selection: ref, snapshot: state.snapshot },
          '2026-10-13',
        ),
        'coverage',
      );
      assert.equal(
        comparisonIssue(
          { selection: ref, snapshot: state.snapshot },
          '2026-10-14',
        ),
        'coverage',
      );
    }
  }
  const mixed = {
    groups: refs,
    week: '2026-10-12',
    day: '2026-10-12',
    mode: 'free' as const,
  };
  assert.deepEqual(
    parseView(viewURL(mixed, new URL('https://campus.example/compare'))).groups,
    refs,
  );
});
test('both persistent paths reject mismatched kinds, owners, week dates and malformed VUC coverage', async () => {
  const w = worker();
  for (const ref of refs) {
    const body = typedSnapshot(ref);
    const wrong = [
      {
        ...body,
        data: { ...body.data, ...(ref.kind ? { id: 371 } : { groupId: 371 }) },
      },
      {
        ...body,
        data: {
          ...body.data,
          kind: ref.kind === 'lecturer' ? 'auditorium' : 'lecturer',
        },
      },
      {
        ...body,
        data: {
          ...body.data,
          lessons: [{ ...snapshot().data.lessons[0], date: '2026-10-19' }],
        },
      },
    ];
    if (ref.kind === 'vuc')
      wrong.push(
        {
          ...body,
          data: { ...body.data, coveredDates: ['2026-10-19'] },
        } as typeof body,
        {
          ...body,
          data: { ...body.data, unresolvedDates: 'invalid' },
        } as unknown as typeof body,
      );
    for (const bad of wrong) {
      assert.equal(await w.context.saveData(pathKey(ref), bad), false);
      // Simulate corrupted/outdated existing persisted data, bypassing writes.
      await (
        await w.context.caches.open(PUBLIC_DATA_CACHE)
      ).put(pathKey(ref), Response.json(bad));
      assert.equal(
        (await w.context.networkData(new Request(pathKey(ref)), pathKey(ref)))
          .status,
        503,
      );
      assert.equal(
        await readSavedScheduleState(ref, '2026-10-12', w.context.caches).then(
          (state) => state.snapshot,
        ),
        undefined,
      );
    }
  }
});
test('malformed optional consumer arrays cannot poison persistent weeks', async () => {
  const w = worker();
  const malformed = [
    { warnings: 'invalid' },
    { warnings: [{}] },
    { unparsedCells: {} },
    { unparsedCells: [{ date: '2026-10-12', reason: null }] },
    ...[
      { teachers: {} },
      { teachers: [{ kind: 'auditorium', id: 1, label: 'Room' }] },
      { audiences: {} },
      { audiences: [null] },
      { sourceIntervals: 'invalid' },
      { sourceIntervals: [{ start: 700, end: 600 }] },
      { roomRef: {} },
    ].map((fields) => ({
      lessons: [{ ...snapshot().data.lessons[0], ...fields }],
    })),
  ];
  for (const ref of refs) {
    for (const fields of malformed) {
      const body = typedSnapshot(ref);
      const bad = { ...body, data: { ...body.data, ...fields } };
      assert.equal(
        await w.context.saveData(pathKey(ref), bad),
        false,
        JSON.stringify(fields),
      );
      await (
        await w.context.caches.open(PUBLIC_DATA_CACHE)
      ).put(pathKey(ref), Response.json(bad));
      assert.equal(
        (await readSavedScheduleState(ref, '2026-10-12', w.context.caches))
          .snapshot,
        undefined,
      );
    }
  }
});
test('worker and foreground share the effective expiry cutoff across Omsk Monday', async () => {
  const monday = '2026-11-02';
  const checked = Date.parse('2026-11-01T17:00:00Z');
  const body = {
    ...snapshot(new Date(checked + 3600000).toISOString()),
    checkedAt: new Date(checked).toISOString(),
    data: { groupId: 370, lessons: [], subgroups: [] },
  };
  const w = worker();
  const path = `https://campus.example/api/schedule/370?week=${monday}`;
  await (
    await w.context.caches.open(PUBLIC_DATA_CACHE)
  ).put(path, Response.json(body));
  for (const now of [
    Date.parse('2026-11-01T17:59:59Z'),
    Date.parse('2026-11-01T18:00:00Z'),
    checked + 1800000 + 86400000,
    checked + 1800000 + 86400001,
  ]) {
    w.context.Date = class extends Date {
      static now() {
        return now;
      }
    };
    assert.equal(
      publicSnapshotDeadline(body, monday, now),
      snapshotDeadline(
        body,
        monday,
        now < Date.parse('2026-11-01T18:00:00Z') ? '2026-10-26' : monday,
      ),
    );
    const state = await readSavedScheduleState(
      370,
      monday,
      w.context.caches,
      now,
    );
    assert.equal(
      (await w.context.networkData(new Request(path), path)).status,
      state.snapshot ? 200 : 503,
    );
    assert.equal(
      state.offline.status,
      state.snapshot ? 'available' : 'expired',
    );
    assert.equal(state.offline.checkedAt, body.checkedAt);
    assert.equal(state.snapshot?.expiresAt ?? body.expiresAt, body.expiresAt);
  }
});
test('oversized payloads, quota denial, missing entries and eviction do not promise offline availability', async () => {
  const w = worker();
  const huge = { ...snapshot(), warning: 'x'.repeat(PUBLIC_BODY_LIMIT) };
  assert.equal(await w.context.saveData(key, huge), false);
  await (
    await w.context.caches.open(PUBLIC_DATA_CACHE)
  ).put(key, Response.json(huge));
  assert.equal(
    (await readSavedScheduleState(370, '2026-10-12', w.context.caches)).offline
      .status,
    'missing',
  );
  const denied = {
    open: async () => {
      throw new Error('quota/privacy denial');
    },
  };
  assert.equal(
    (await readSavedScheduleState(370, '2026-10-12', denied)).offline.status,
    'unavailable',
  );
  w.context.caches = denied;
  assert.equal((await w.context.networkData(request, key)).status, 503);
  const noStorageWorker = {
    active: {
      postMessage: (data: unknown, ports: MessagePort[]) => {
        w.handlers.message({
          data,
          ports,
          waitUntil: (value: Promise<unknown>) => void value,
        });
      },
    },
  } as unknown as Pick<ServiceWorkerRegistration, 'active'>;
  assert.equal(
    await handoffPwaResponse(
      Promise.resolve(noStorageWorker),
      savedSchedulePath(370, '2026-10-12'),
      snapshot(),
    ),
    false,
  );
  assert.equal(
    await handoffPwaResponse(
      Promise.resolve({ active: null }),
      savedSchedulePath(370, '2026-10-12'),
      snapshot(),
    ),
    false,
  );
});
test('compatibility is bounded to two shells, routes old hashed JS/CSS offline and never serves old HTML', async () => {
  const stores = new Map<string, Map<string, Response>>();
  const oldest = worker('oldest', undefined, stores);
  await (
    await oldest.context.caches.open('campus-shell-oldest')
  ).put('/assets/lazy-oldest.js', new Response('retired'));
  const old = worker('old', undefined, stores);
  const cache = await old.context.caches.open('campus-shell-old');
  await cache.put('/assets/lazy-old.css', new Response('old CSS'));
  await cache.put('/', new Response('old HTML'));
  await old.context.caches.open('campus-shell-interrupted');
  const next = worker('next', undefined, stores);
  await (
    await next.context.caches.open('campus-shell-next')
  ).put('/', new Response('new HTML'));
  let activation: Promise<void> | undefined;
  next.handlers.activate({
    waitUntil: (value: Promise<void>) => {
      activation = value;
    },
  });
  await activation;
  assert.deepEqual(
    [...stores.keys()],
    ['campus-shell-old', 'campus-shell-next'],
  );
  assert.equal(
    await (await intercepted(next, '/assets/lazy-old.css'))!.text(),
    'old CSS',
  );
  await assert.rejects(intercepted(next, '/assets/lazy-oldest.js')!, /offline/);
  let html!: Promise<Response>;
  next.handlers.fetch({
    request: {
      method: 'GET',
      mode: 'navigate',
      url: 'https://campus.example/',
    },
    respondWith: (value: Promise<Response>) => {
      html = value;
    },
  });
  assert.equal(await (await html).text(), 'new HTML');
});

test('rollback retains the last activated build rather than the last created cache', async () => {
  const stores = new Map<string, Map<string, Response>>();
  async function activate(build: string) {
    const w = worker(build, ['/', `/assets/lazy-${build}.js`], stores);
    const cache = await w.context.caches.open(`campus-shell-${build}`);
    await cache.put('/', new Response(`${build} HTML`));
    await cache.put(`/assets/lazy-${build}.js`, new Response(build));
    let done!: Promise<void>;
    w.handlers.activate({
      waitUntil: (value: Promise<void>) => {
        done = value;
      },
    });
    await done;
    return w;
  }
  await activate('A');
  await activate('B');
  await activate('A');
  const next = await activate('C');
  assert.deepEqual([...stores.keys()], ['campus-shell-A', 'campus-shell-C']);
  assert.equal(
    await (await intercepted(next, '/assets/lazy-A.js'))!.text(),
    'A',
  );
  await assert.rejects(intercepted(next, '/assets/lazy-B.js')!, /offline/);
});

test('a cold VUC catalogue uses the same persistent store and original timestamps, with HTTP/abort failures preserved', async () => {
  const w = worker();
  const body = { ...snapshot(), data: [refs[3]] };
  const path = '/api/vuc?term=';
  const catalogueKey = 'https://campus.example' + path;
  assert.equal(await w.context.saveData(catalogueKey, body), true);
  const fetchBefore = globalThis.fetch;
  const storageBefore = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  Object.defineProperty(globalThis, 'caches', {
    configurable: true,
    value: w.context.caches,
  });
  const clients: QueryClient[] = [];
  function freshClient() {
    const client = new QueryClient();
    clients.push(client);
    return client;
  }
  try {
    // No service worker interception and no query memory: foreground recovery.
    globalThis.fetch = async () => {
      throw new TypeError('offline');
    };
    const restored = await freshClient().fetchQuery(vucSearchOptions(''));
    assert.deepEqual(restored.data, body.data);
    assert.equal(restored.stale, true);
    assert.equal(restored.checkedAt, body.checkedAt);
    assert.equal(restored.expiresAt, body.expiresAt);
    globalThis.fetch = async () =>
      Response.json({ error: 'catalogue unavailable' }, { status: 503 });
    await assert.rejects(
      freshClient().fetchQuery(vucSearchOptions('')),
      /catalogue unavailable/,
    );
    globalThis.fetch = async () => {
      throw new DOMException('cancelled', 'AbortError');
    };
    await assert.rejects(
      freshClient().fetchQuery(vucSearchOptions('')),
      /cancelled/,
    );
    globalThis.fetch = async () => {
      throw new TypeError('offline');
    };
    const expired = {
      ...body,
      checkedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      expiresAt: new Date(Date.now() - 2 * 86400000 + 3600000).toISOString(),
    };
    await (
      await w.context.caches.open(PUBLIC_DATA_CACHE)
    ).put(catalogueKey, Response.json(expired));
    await assert.rejects(
      freshClient().fetchQuery(vucSearchOptions('')),
      /серверу|сети/,
    );
    await (await w.context.caches.open(PUBLIC_DATA_CACHE)).delete(catalogueKey);
    await assert.rejects(
      freshClient().fetchQuery(vucSearchOptions('')),
      /серверу|сети/,
    );
  } finally {
    globalThis.fetch = fetchBefore;
    if (storageBefore)
      Object.defineProperty(globalThis, 'caches', storageBefore);
    else Reflect.deleteProperty(globalThis, 'caches');
    for (const client of clients) client.clear();
  }
});
test('foreground resource/VUC API validation rejects incorrect owner, type, week and coverage', async () => {
  const original = globalThis.fetch;
  try {
    for (const ref of refs.slice(1)) {
      if (!ref.kind) continue;
      const body = typedSnapshot(ref);
      globalThis.fetch = async () => Response.json(body);
      const load = () =>
        ref.kind === 'vuc'
          ? loadVucWeek(ref, '2026-10-12')
          : ref.kind === 'lecturer' || ref.kind === 'auditorium'
            ? loadResourceWeek(ref, '2026-10-12')
            : Promise.reject();
      assert.deepEqual(await load(), body);
      for (const data of [
        { ...body.data, id: 'another-owner' },
        {
          ...body.data,
          kind: ref.kind === 'lecturer' ? 'auditorium' : 'lecturer',
        },
        {
          ...body.data,
          lessons: [{ ...snapshot().data.lessons[0], date: '2026-10-19' }],
        },
        ...(ref.kind === 'vuc'
          ? [
              { ...body.data, coveredDates: ['2026-10-19'] },
              { ...body.data, unresolvedDates: 'invalid' },
            ]
          : []),
      ]) {
        globalThis.fetch = async () => Response.json({ ...body, data });
        await assert.rejects(load(), /другого объекта|некорректное расписание/);
      }
    }
  } finally {
    globalThis.fetch = original;
  }
});
test('an unacknowledged first-load handoff stops waiting at its explicit timeout', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const pending = handoffPwaResponse(
    Promise.resolve({ active: { postMessage: () => {} } } as unknown as Pick<
      ServiceWorkerRegistration,
      'active'
    >),
    savedSchedulePath(370, '2026-10-12'),
    snapshot(),
  );
  await Promise.resolve(); // Observe registration completion before advancing its acknowledgement clock.
  t.mock.timers.tick(5000);
  assert.equal(await pending, false);
});
