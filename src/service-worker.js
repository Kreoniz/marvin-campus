/* Build substitutes the constants; API responses keep server freshness. */
const SHELL_PREFIX = 'campus-shell-';
const SHELL = SHELL_PREFIX + __CAMPUS_BUILD__;
const ASSETS = __CAMPUS_ASSETS__;
/* __CAMPUS_PUBLIC_CACHE__ */
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
  return publicDataTarget(url)?.key;
}
let saving = Promise.resolve();
function saveData(key, body) {
  // Serialize puts/pruning: concurrent first-load handoffs must respect the cap.
  const result = saving.then(async () => {
    const target = publicDataTarget(new URL(key));
    if (!target || !publicBodyUsable(target, body)) return false;
    const text = publicBodyText(body);
    if (text === undefined) return false;
    const cache = await caches.open(PUBLIC_DATA_CACHE);
    await cache.put(
      key,
      new Response(text, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }),
    );
    const keys = await cache.keys();
    for (const request of keys.slice(
      0,
      Math.max(0, keys.length - PUBLIC_DATA_LIMIT),
    ))
      await cache.delete(request);
    return true;
  });
  saving = result.catch(() => {});
  return result;
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
  if (key)
    event.waitUntil(
      saveData(key, event.data.body)
        .then((saved) => {
          event.ports?.[0]?.postMessage({ saved });
        })
        .catch(() => event.ports?.[0]?.postMessage({ saved: false })),
    );
});
async function networkData(request, key) {
  try {
    const response = await fetch(request);
    // HTTP errors remain errors; only unavailable network uses the offline copy.
    if (response.ok) {
      try {
        await saveData(key, await readPublicResponse(response.clone()));
      } catch {}
    }
    return response;
  } catch (error) {
    if (request.signal.aborted) throw error;
    try {
      const body = await readPublicResponse(
        await (await caches.open(PUBLIC_DATA_CACHE)).match(key),
      );
      const target = publicDataTarget(new URL(key));
      if (target && publicBodyUsable(target, body)) {
        if (target.kind === 'share') return Response.json(body);
        return Response.json(
          {
            ...body,
            stale: true,
            warning: [
              body.warning,
              'Нет сети. Сохранённый снимок; изменения расписания пока недоступны.',
            ]
              .filter(Boolean)
              .join(' '),
          },
          { headers: { 'Cache-Control': 'no-store' } },
        );
      }
    } catch {}
    return Response.json(
      {
        error:
          'Нет сети. Снимок не сохранён, удалён, недоступен или слишком старый. Подключись для загрузки.',
      },
      { status: 503 },
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
      url.pathname === '/vuc' ||
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
