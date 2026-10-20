import { useSyncExternalStore } from 'react';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PwaState {
  installed: boolean;
  offline: boolean;
  install?: InstallPrompt;
  waiting?: ServiceWorker;
  updating: boolean;
}

const serverState: PwaState = {
  installed: false,
  offline: false,
  updating: false,
};
let state = serverState;
let initialized = false;
const listeners = new Set<() => void>();

function update(next: Partial<PwaState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePwa(): PwaState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
}

export function initPwa() {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;
  update({
    installed:
      window.matchMedia('(display-mode: standalone)').matches ||
      !!(navigator as Navigator & { standalone?: boolean }).standalone,
    offline: !navigator.onLine,
  });
  window.addEventListener('online', () => update({ offline: false }));
  window.addEventListener('offline', () => update({ offline: true }));
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    update({ install: event as InstallPrompt });
  });
  window.addEventListener('appinstalled', () =>
    update({ installed: true, install: undefined }),
  );
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (state.updating) location.reload();
  });
  void navigator.serviceWorker
    .register('/sw.js', { updateViaCache: 'none' })
    .then((registration) => {
      update({ waiting: registration.waiting ?? undefined });
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => {
          if (
            worker.state === 'installed' &&
            navigator.serviceWorker.controller
          )
            update({ waiting: registration.waiting ?? undefined });
        });
      });
      window.addEventListener(
        'online',
        () => void registration.update().catch(() => {}),
      );
    })
    .catch(() => {});
}

// First-load data can arrive before the service worker takes control.
export function cachePwaResponse(path: string, body: unknown) {
  if (
    !import.meta.env?.PROD ||
    typeof navigator === 'undefined' ||
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
  const prompt = state.install;
  if (!prompt) return;
  update({ install: undefined });
  await prompt.prompt();
  await prompt.userChoice;
}

export function updatePwa() {
  if (!state.waiting) return;
  update({ updating: true });
  state.waiting?.postMessage({ type: 'SKIP_WAITING' });
}
