import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { readSavedSchedule } from './saved-schedules.ts';

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const stores = new Map<string, Map<string, Response>>();
  let network: () => Promise<Response> = async () => {
    throw new TypeError('offline');
  };
  const context: any = {
    URL,
    Response,
    Date,
    __CAMPUS_BUILD__: 'test',
    __CAMPUS_ASSETS__: ['/', '/assets/app.js'],
    self: {
      location: { origin: 'https://campus.example' },
      addEventListener: (name: string, fn: any) => (handlers[name] = fn),
    },
    fetch: () => network(),
    caches: {
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
  runInNewContext(
    readFileSync(new URL('../service-worker.js', import.meta.url), 'utf8'),
    context,
  );
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
      lessons: [{ id: 'lesson', date: '2026-10-12' }],
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
  for (let id = 1; id <= 105; id++)
    await w.context.saveData(key.replace('/370?', `/${id}?`), snapshot());
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
