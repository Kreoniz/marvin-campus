interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export const pwa = $state({
  installed:
    matchMedia('(display-mode: standalone)').matches ||
    !!(navigator as Navigator & { standalone?: boolean }).standalone,
  offline: !navigator.onLine,
  install: undefined as InstallPrompt | undefined,
  waiting: undefined as ServiceWorker | undefined,
  updating: false,
});
export function initPwa() {
  window.addEventListener('online', () => (pwa.offline = false));
  window.addEventListener('offline', () => (pwa.offline = true));
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    pwa.install = event as InstallPrompt;
  });
  window.addEventListener('appinstalled', () => {
    pwa.installed = true;
    pwa.install = undefined;
  });
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (pwa.updating) location.reload();
  });
  void navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      pwa.waiting = registration.waiting ?? undefined;
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (
            worker.state === 'installed' &&
            navigator.serviceWorker.controller
          )
            pwa.waiting = registration.waiting ?? undefined;
        });
      });
      window.addEventListener(
        'online',
        () => void registration.update().catch(() => {}),
      );
    })
    .catch(() => {});
}
// First-load data may arrive before the worker takes control.
export function cachePwaResponse(path: string, body: unknown) {
  if (
    !import.meta.env.PROD ||
    !('serviceWorker' in navigator) ||
    !/^\/api\/(schedule\/\d+\?week=\d{4}-\d{2}-\d{2}(?:&refresh=1)?|share\/[A-Za-z0-9_-]{12})$/.test(
      path,
    )
  )
    return;
  void navigator.serviceWorker.ready
    .then((registration) => {
      registration.active?.postMessage({ type: 'CACHE_DATA', path, body });
    })
    .catch(() => {});
}
export async function installPwa() {
  const prompt = pwa.install;
  if (!prompt) return;
  pwa.install = undefined;
  await prompt.prompt();
  await prompt.userChoice;
}
export function updatePwa() {
  if (!pwa.waiting) return;
  pwa.updating = true;
  pwa.waiting.postMessage({ type: 'SKIP_WAITING' });
}
