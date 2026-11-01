import { useSyncExternalStore } from 'react';
import {
  publicBodyText,
  publicDataTarget,
  validPublicBody,
} from './public-cache.js';

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
export function cachePwaResponse(
  path: string,
  body: unknown,
): Promise<boolean> {
  if (
    !import.meta.env?.PROD ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator)
  )
    return Promise.resolve(false);
  const target = publicDataTarget(new URL(path, location.origin));
  if (
    !target ||
    !validPublicBody(target, body) ||
    publicBodyText(body) === undefined
  )
    return Promise.resolve(false);
  return handoffPwaResponse(navigator.serviceWorker.ready, path, body).then(
    (saved) => {
      // Re-read the actual cache: an acknowledgement alone is not availability.
      window.dispatchEvent(new Event('campus-public-cache-change'));
      return saved;
    },
  );
}
// Keep the first response until registration is ready, as on the original
// uncontrolled-page path. Bound acknowledgement once an active worker exists;
// an older worker may not support it. Timeout is never a persistence promise.
export function handoffPwaResponse(
  ready: Promise<Pick<ServiceWorkerRegistration, 'active'>>,
  path: string,
  body: unknown,
  timeout = 5000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let finished = false;
    const finish = (saved: boolean) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      channel.port1.close();
      channel.port2.close();
      resolve(saved);
    };
    channel.port1.onmessage = (event) => finish(event.data?.saved === true);
    void ready
      .then((registration) => {
        if (finished) return;
        if (!registration.active) {
          finish(false);
          return;
        }
        timer = setTimeout(() => finish(false), timeout);
        registration.active.postMessage({ type: 'CACHE_DATA', path, body }, [
          channel.port2,
        ]);
      })
      .catch(() => finish(false));
  });
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
