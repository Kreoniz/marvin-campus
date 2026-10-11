import { analyticsData, type EventData } from './analytics-policy.ts';
interface UmamiPayload {
  url: string;
  referrer: string;
  title: string;
  [key: string]: unknown;
}
interface Umami {
  track: ((
    name: string,
    data?: Record<string, string | number | boolean>,
  ) => void) &
    (() => void);
}
declare global {
  interface Window {
    umami?: Umami;
    campusAnalyticsBeforeSend?: (
      type: string,
      payload: UmamiPayload,
    ) => UmamiPayload;
  }
}
let state: 'pending' | 'ready' | 'disabled' = 'pending';
const pending: { name: string; data: EventData }[] = [];
let sourceShareID: string | undefined;

export function setShareSource(id: string | undefined) {
  sourceShareID = id;
}
function enabled() {
  return (
    location.hostname === 'campus.kreoniz.ru' && navigator.doNotTrack !== '1'
  );
}
function disable() {
  state = 'disabled';
  pending.length = 0;
}

function cleanURL(value: string): string {
  if (!value) return '';
  try {
    const url = new URL(value, location.origin);
    url.search = '';
    url.hash = '';
    if (url.hostname === 'campus.kreoniz.ru') url.pathname = '/';
    return url.href;
  } catch {
    return '';
  }
}

export async function initAnalytics() {
  if (!enabled()) return disable();
  try {
    const response = await fetch('/api/config');
    const { umamiWebsiteId } = await response.json();
    if (!umamiWebsiteId) return disable();
    // Umami applies this hook to pageviews and named events alike.
    window.campusAnalyticsBeforeSend = (_type, payload) => ({
      ...payload,
      url: cleanURL(payload.url),
      referrer: cleanURL(payload.referrer),
      title: 'Марвин Campus',
    });
    const script = document.createElement('script');
    script.defer = true;
    script.src = 'https://stats.kreoniz.ru/script.js';
    for (const [key, value] of Object.entries({
      websiteId: umamiWebsiteId,
      domains: 'campus.kreoniz.ru',
      autoPageview: 'false',
      excludeSearch: 'true',
      excludeHash: 'true',
      doNotTrack: 'true',
      beforeSend: 'campusAnalyticsBeforeSend',
    }))
      script.dataset[key] = value;
    script.onload = () => {
      try {
        if (!window.umami) return disable();
        state = 'ready';
        window.umami.track();
        for (const { name, data } of pending.splice(0))
          window.umami.track(name, data);
      } catch {}
    };
    script.onerror = disable;
    document.head.append(script);
  } catch {
    disable();
    /* Analytics failure must never affect schedules. */
  }
}

export function track(name: string, data: EventData = {}) {
  if (!enabled() || state === 'disabled') return;
  try {
    const filtered = analyticsData(name, data, sourceShareID);
    if (!filtered) return;
    data = filtered;
    if (state === 'ready') window.umami?.track(name, data);
    else if (pending.length < 50) pending.push({ name, data });
  } catch {}
}
