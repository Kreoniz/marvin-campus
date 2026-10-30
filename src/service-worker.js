/* Build substitutes the constants; API responses keep server freshness. */
const SHELL_PREFIX = 'campus-shell-';
const SHELL = SHELL_PREFIX + __CAMPUS_BUILD__;
const ASSETS = __CAMPUS_ASSETS__;
const DATA = 'campus-public-data-v1';
const LIMIT = 100;
const DAY = 24 * 60 * 60 * 1000;
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith(SHELL_PREFIX) && name !== SHELL)
          await caches.delete(name);
      await self.clients.claim();
    })(),
  );
});
function dataKey(url) {
  if (
    /^\/api\/schedule\/\d+$/.test(url.pathname) &&
    /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('week') ?? '')
  )
    return `${url.origin}${url.pathname}?week=${url.searchParams.get('week')}`;
  if (/^\/api\/share\/[A-Za-z0-9_-]{12}$/.test(url.pathname))
    return url.origin + url.pathname;
}
function validBody(key, body) {
  if (key.includes('/api/schedule/'))
    return (
      body?.data &&
      Array.isArray(body.data.lessons) &&
      Number.isFinite(Date.parse(body.checkedAt)) &&
      Number.isFinite(Date.parse(body.expiresAt))
    );
  return (
    Array.isArray(body?.groups) &&
    typeof body.week === 'string' &&
    typeof body.day === 'string'
  );
}
async function saveData(key, body) {
  if (!validBody(key, body)) return;
  const cache = await caches.open(DATA);
  await cache.put(
    key,
    Response.json(body, { headers: { 'Cache-Control': 'no-store' } }),
  );
  const keys = await cache.keys();
  for (const request of keys.slice(0, Math.max(0, keys.length - LIMIT)))
    await cache.delete(request);
}
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data?.type !== 'CACHE_DATA') return;
  const url = new URL(event.data.path, self.location.origin);
  if (url.origin !== self.location.origin) return;
  const key = dataKey(url);
  if (key) event.waitUntil(saveData(key, event.data.body));
});
async function networkData(request, key) {
  try {
    const response = await fetch(request);
    // HTTP errors remain errors; only unavailable network uses the offline copy.
    if (response.ok) {
      try {
        await saveData(key, await response.clone().json());
      } catch {}
    }
    return response;
  } catch (error) {
    if (request.signal.aborted) throw error;
    const cached = await (await caches.open(DATA)).match(key);
    if (!cached)
      return Response.json(
        {
          error:
            'Нет сети. Это расписание или ссылка ещё не сохранены на устройстве.',
        },
        { status: 503 },
      );
    if (!key.includes('/api/schedule/')) return cached;
    const body = await cached.json();
    if (!validBody(key, body) || Date.now() > Date.parse(body.expiresAt) + DAY)
      return Response.json(
        {
          error:
            'Нет сети, а сохранённое расписание слишком старое. Подключись для обновления.',
        },
        { status: 503 },
      );
    return Response.json(
      {
        ...body,
        stale: true,
        warning:
          'Нет сети. Сохранённый снимок; изменения расписания пока недоступны.',
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
self.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const key = dataKey(url);
  if (key) {
    event.respondWith(networkData(request, key));
    return;
  }
  // Keep one build's HTML and assets together until a requested update.
  if (
    request.mode === 'navigate' &&
    (url.pathname === '/' ||
      url.pathname === '/compare' ||
      /^\/s\/[A-Za-z0-9_-]{12}\/?$/.test(url.pathname) ||
      /^\/(?:g\d{1,8}|~?[a-z_]{1,112}-\d{2,5})(?:-(?:s\d{1,2}|sid\d{1,8}))?(?:\+(?:g\d{1,8}|~?[a-z_]{1,112}-\d{2,5})(?:-(?:s\d{1,2}|sid\d{1,8}))?){0,29}\/?$/i.test(
        url.pathname,
      ))
  ) {
    event.respondWith(
      caches
        .open(SHELL)
        .then(async (cache) => (await cache.match('/')) || fetch(request)),
    );
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches
        .open(SHELL)
        .then(
          async (cache) => (await cache.match(url.pathname)) || fetch(request),
        ),
    );
  }
});
