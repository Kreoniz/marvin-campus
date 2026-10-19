import { onMount } from 'svelte';
import { useQueryClient } from '@tanstack/svelte-query';
import { readShare } from './api.ts';
import {
  normalizeView,
  parseView,
  readableGroups,
  shareID,
  viewURL,
} from './url.ts';
import { rememberGroups, resolveReadable } from './group-directory.ts';
import { track } from './analytics.ts';
import type { ComparisonView, Notify } from './comparison-view.svelte.ts';

export function createComparisonLinks(
  view: ComparisonView,
  notify: Notify,
  opened: () => void,
) {
  const client = useQueryClient();
  let opening = $state(location.pathname !== '/'),
    error = $state(''),
    sharing = $state(false),
    manual = $state('');
  let readController: AbortController | undefined;
  function canonicalize() {
    if (opening || error) return;
    const value = view.current();
    rememberGroups(value.groups);
    history.replaceState(
      { campusView: value },
      '',
      viewURL(value, new URL(location.href)),
    );
  }
  function sync() {
    manual = '';
    const value = view.current();
    rememberGroups(value.groups);
    history.pushState(
      { campusView: value },
      '',
      viewURL(value, new URL(location.href)),
    );
  }
  async function openLocation(url: URL) {
    readController?.abort();
    readController = new AbortController();
    const signal = readController.signal,
      id = shareID(url);
    error = '';
    manual = '';
    opening = true;
    try {
      if (!id && url.pathname.startsWith('/s/'))
        throw new Error('Ссылка на сравнение не найдена.');
      const readable = readableGroups(url);
      const value = id
        ? normalizeView(await readShare(id, signal))
        : readable !== undefined
          ? await resolveReadable(url, client, signal)
          : parseView(url);
      if (signal.aborted) return;
      view.apply(value);
      if (id || readable !== undefined) {
        opened();
        track('share_opened', {
          link_format: id ? 'legacy' : 'readable',
          group_count: value.groups.length,
          mode: value.mode,
        });
      }
      opening = false;
      canonicalize();
    } catch (e) {
      if (!signal.aborted)
        error =
          e instanceof Error ? e.message : 'Не удалось открыть сравнение.';
    } finally {
      if (!signal.aborted) opening = false;
    }
  }
  async function copy() {
    if (sharing) return;
    sharing = true;
    const value = view.current(),
      url = viewURL(value, new URL(location.origin)).href;
    manual = '';
    canonicalize();
    try {
      // Synchronous URL creation keeps Safari's clipboard user activation.
      await navigator.clipboard.writeText(url);
      notify('Ссылка скопирована. Можно отправлять другу.');
      track('share_link_copied', {
        link_format: 'readable',
        group_count: value.groups.length,
        mode: value.mode,
      });
    } catch {
      manual = url;
      notify('Выдели и скопируй ссылку ниже.', 'info');
    } finally {
      sharing = false;
    }
  }
  onMount(() => {
    const url = new URL(location.href);
    if (url.pathname !== '/') void openLocation(url);
    else {
      if (!url.searchParams.has('g')) {
        try {
          const groups = JSON.parse(
            localStorage.getItem('campus-groups') ?? '[]',
          );
          view.apply(normalizeView({ ...view.current(), groups }));
        } catch {}
      }
      if (view.groups.length) canonicalize();
      else
        history.replaceState({ campusView: view.current() }, '', location.href);
    }
    const onBack = (event: PopStateEvent) => {
      if (!event.state?.campusView) {
        void openLocation(new URL(location.href));
        return;
      }
      readController?.abort();
      opening = false;
      error = '';
      manual = '';
      view.apply(normalizeView(event.state.campusView));
      canonicalize();
    };
    window.addEventListener('popstate', onBack);
    return () => {
      readController?.abort();
      window.removeEventListener('popstate', onBack);
    };
  });
  return {
    sync,
    copy,
    canonicalize,
    get opening() {
      return opening;
    },
    get error() {
      return error;
    },
    get sharing() {
      return sharing;
    },
    get manual() {
      return manual;
    },
    async copyManual() {
      try {
        await navigator.clipboard.writeText(manual);
        const value = view.current();
        track('share_link_copied', {
          link_format: 'readable',
          group_count: value.groups.length,
          mode: value.mode,
        });
        notify('Ссылка скопирована.');
        manual = '';
      } catch {
        notify('Выдели ссылку и скопируй её вручную.', 'info');
      }
    },
  };
}
