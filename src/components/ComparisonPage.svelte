<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { Tooltip } from 'bits-ui';
  import { parseView } from '../lib/url.ts';
  import { addDays, monday, omskToday } from '../lib/dates.ts';
  import { compareDay } from '../lib/domain.ts';
  import { assignColors, type GroupColors } from '../lib/colors.ts';
  import { initAnalytics, track } from '../lib/analytics.ts';
  import Toast from './Toast.svelte';
  import Icon from './Icon.svelte';
  import GroupPicker from './GroupPicker.svelte';
  import ComparisonStatus from './ComparisonStatus.svelte';
  import MobileDayNav from './MobileDayNav.svelte';
  import ComparisonSummary from './ComparisonSummary.svelte';
  import { selectionData } from '../lib/selection-analytics.ts';
  import Calendar from './Calendar.svelte';
  import DayDetail from './DayDetail.svelte';
  import ComparisonToolbar from './ComparisonToolbar.svelte';
  import GroupOrder from './GroupOrder.svelte';
  import SiteHeader from './SiteHeader.svelte';
  import { pwa, updatePwa } from '../lib/pwa.svelte.ts';
  import { mergeSubgroups, savedSubgroups } from '../lib/subgroups.ts';
  import { createComparisonView } from '../lib/comparison-view.svelte.ts';
  import { createComparisonLinks } from '../lib/comparison-links.svelte.ts';
  import { createSchedules } from '../lib/schedules.svelte.ts';
  import { scheduleNavigation } from '../lib/keyboard.ts';
  let toasts = $state<
    { id: number; kind: 'success' | 'error' | 'info'; message: string }[]
  >([]);
  let toastId = 0;
  function savedColors(): GroupColors {
    try {
      const saved = JSON.parse(localStorage.getItem('campus-colors') ?? '{}');
      return saved && typeof saved === 'object' ? saved : {};
    } catch {
      return {};
    }
  }
  function notify(
    message: string,
    kind: 'success' | 'error' | 'info' = 'success',
  ) {
    toasts = [
      ...toasts.filter((t) => t.message !== message),
      { id: ++toastId, kind, message },
    ].slice(-3);
  }

  let subgroupCatalog = $state(savedSubgroups());
  const initial = parseView(new URL(location.href));
  const view = createComparisonView(
    initial,
    () => links.sync(),
    notify,
    () => subgroupCatalog,
  );
  const links = createComparisonLinks(view, notify, () => {
    reportKey = '';
    reportedSelections = new Map();
  });
  const source = createSchedules(
    () => view.groups,
    () => view.week,
    () => !links.opening && !links.error,
  );
  let groups = $derived(view.groups),
    week = $derived(view.week),
    day = $derived(view.day),
    mode = $derived(view.mode);
  let openingShare = $derived(links.opening),
    shareError = $derived(links.error);
  let live = $derived(source.schedules);
  let busy = $derived(openingShare || source.pending);
  let fetching = $derived(openingShare || source.fetching);
  let colors = $state<GroupColors>(
    assignColors(
      initial.groups.map((g) => g.id),
      savedColors(),
    ),
  );
  let theme = $state(document.documentElement.dataset.theme ?? 'light'),
    orderOpen = $state(false),
    orderFocus = $state(0);
  let viewportWidth = $state(innerWidth),
    mobileView = $state<'day' | 'week'>('day');
  let mobile = $derived(viewportWidth <= 700);
  const add = view.add,
    moveGroup = view.move,
    selectDay = view.selectDay;
  async function navigateWithKeyboard(event: KeyboardEvent) {
    if (openingShare || shareError || !(event.target instanceof HTMLElement))
      return;
    const target = event.target;
    if (
      target.closest(
        'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
      ) ||
      document.querySelector(
        '[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"][data-state="open"]',
      )
    )
      return;
    const dayButton = target.closest<HTMLElement>('[data-schedule-day]');
    const weekControls = target.closest('[data-schedule-week]');
    if (!dayButton && !weekControls) return;
    const action = scheduleNavigation(
      event,
      dayButton ? 'day' : 'week',
      dayButton?.dataset.scheduleDay ?? day,
      week,
    );
    if (!action) return;
    event.preventDefault();
    const dayControls = dayButton?.closest('[data-schedule-days]');
    if (action.type === 'week') view.selectWeek(action.value);
    else selectDay(action.value);
    if (dayControls) {
      await tick();
      dayControls
        .querySelector<HTMLButtonElement>(`[data-schedule-day="${view.day}"]`)
        ?.focus({ preventScroll: true });
    }
  }
  let reportKey = '';
  const reportedLoads = new Set<string>();
  $effect(() => {
    const known = subgroupCatalog;
    groups;
    untrack(() => {
      if (view.resolveSubgroups(known)) links.canonicalize();
    });
  });
  $effect(() => {
    const ids = groups.map((g) => g.id);
    if (ids.length)
      untrack(() => {
        colors = assignColors(ids, colors);
        try {
          localStorage.setItem('campus-colors', JSON.stringify(colors));
        } catch {}
      });
  });
  $effect(() => {
    const snapshots = live.filter((g) => g.snapshot);
    if (!snapshots.length) return;
    untrack(() => {
      const next = { ...subgroupCatalog };
      for (const group of snapshots)
        next[group.selection.id] = mergeSubgroups(
          next[group.selection.id] ?? [],
          group.snapshot!.data.subgroups,
        );
      if (JSON.stringify(next) !== JSON.stringify(subgroupCatalog)) {
        subgroupCatalog = next;
        try {
          localStorage.setItem('campus-subgroups', JSON.stringify(next));
        } catch {}
      }
    });
  });
  $effect(() => {
    if (fetching || !groups.length) return;
    const revision = JSON.stringify([
      week,
      groups.map((g) => g.id).sort((a, b) => a - b),
      source.revision,
    ]);
    if (reportedLoads.has(revision)) return;
    reportedLoads.add(revision);
    track('schedule_loaded', {
      group_count: groups.length,
      success: live.every((g) => !!g.snapshot),
      stale: live.some((g) => !!g.snapshot?.stale),
      week_relation:
        week < monday(omskToday())
          ? 'past'
          : week > monday(omskToday())
            ? 'future'
            : 'current',
    });
  });
  $effect(() => {
    const signature = JSON.stringify([
      groups
        .slice()
        .sort((a, b) => a.id - b.id)
        .map((g) => [
          g.id,
          g.subgroupNumber ? `s${g.subgroupNumber}` : g.subgroup,
        ]),
      week,
      mode,
    ]);
    if (
      groups.length < 2 ||
      busy ||
      live.some((g) => !g.snapshot) ||
      signature === reportKey
    )
      return;
    reportKey = signature;
    const results = Array.from({ length: 7 }, (_, i) =>
      compareDay(live, addDays(week, i)),
    );
    track('comparison_used', {
      group_count: groups.length,
      mode,
      has_overlap: results.some((r) =>
        mode === 'presence' ? r.presence.length > 0 : r.free.length > 0,
      ),
      stale: live.some((g) => !!g.snapshot?.stale),
    });
  });

  let reportedSelections = new Map<number, string>();
  $effect(() => {
    if (busy) return;
    const next = new Map<number, string>();
    for (const group of live) {
      const signature = JSON.stringify([
        group.selection.id,
        group.selection.subgroupNumber
          ? `s${group.selection.subgroupNumber}`
          : group.selection.subgroup,
      ]);
      if (group.snapshot) {
        next.set(group.selection.id, signature);
        if (reportedSelections.get(group.selection.id) !== signature)
          track('group_selected', selectionData(group.selection));
      }
    }
    reportedSelections = next;
  });

  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('campus-theme', theme);
    } catch {}
    track('theme_changed', { theme });
  }
  onMount(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const onTheme = () => {
      try {
        if (localStorage.getItem('campus-theme')) return;
      } catch {}
      theme = media.matches ? 'dark' : 'light';
      document.documentElement.dataset.theme = theme;
    };
    media.addEventListener('change', onTheme);
    void initAnalytics();
    return () => media.removeEventListener('change', onTheme);
  });
</script>

<svelte:head
  ><title
    >Марвин Campus — {groups.length
      ? groups.map((g) => g.label).join(' + ')
      : 'найдём время пересечься'}</title
  ></svelte:head
>
<svelte:window
  bind:innerWidth={viewportWidth}
  onkeydown={navigateWithKeyboard}
/>
<Tooltip.Provider delayDuration={350} ignoreNonKeyboardFocus>
  <a class="skip-link" href="#comparison">Перейти к расписанию</a>
  <GroupOrder
    {groups}
    {colors}
    bind:open={orderOpen}
    onmove={moveGroup}
    returnFocus={orderFocus}
  />
  <div class="app-shell">
    <SiteHeader {theme} ontoggletheme={toggleTheme} />
    <main>
      {#if pwa.offline}<p class="offline-note" role="status">
          Нет сети. Доступны сохранённые расписания.
        </p>{/if}
      <h1 class="sr-only">Сравнение расписаний ОмГТУ</h1>
      {#if shareError}
        <section id="comparison" class="panel share-state" aria-live="polite">
          <p>{shareError}</p>
          <a class="button" href="/">Открыть своё расписание</a>
        </section>
      {:else}
        <section
          id="comparison"
          class="comparison panel"
          aria-label="Сравнение расписаний"
          aria-busy={busy}
        >
          <ComparisonToolbar
            {view}
            schedules={live}
            {subgroupCatalog}
            {colors}
            opening={openingShare}
            onorder={(id) => {
              orderFocus = id;
              orderOpen = true;
            }}
            onerror={(message) => notify(message, 'error')}
          />
          {#if groups.length || openingShare}
            {#if mobile}<MobileDayNav
                {view}
                opening={openingShare}
                bind:mobileView
              />{/if}
            <ComparisonStatus schedules={live} {fetching} {links} />
            {#if mobile}<div class="mobile-result">
                <ComparisonSummary
                  schedules={live}
                  {day}
                  {mode}
                  loading={busy}
                  placeholder={openingShare}
                  compact
                />
              </div>{/if}
            <Calendar
              schedules={live}
              {colors}
              {subgroupCatalog}
              {week}
              {day}
              {mode}
              loading={busy}
              placeholder={openingShare}
              onday={selectDay}
              singleDay={mobile && mobileView === 'day'}
              compactHeader={mobile}
            />
          {:else}<div class="welcome">
              <img
                src="/assets/mascot-mint-thinking-v1.webp"
                width="190"
                height="190"
                alt="Марвин ждёт расписание"
              />
              <div>
                <h2>С кем пересечёмся?</h2>
                <p>
                  Добавь свою группу и группу друга.<br />С одной группой можно
                  посмотреть своё расписание.
                </p>
                <GroupPicker
                  selected={groups}
                  onadd={add}
                  onerror={(message) => notify(message, 'error')}
                /><button class="example-button" onclick={view.example}
                  >Посмотреть ИВТ-241 и ИВТ-242 <span aria-hidden="true">→</span
                  ></button
                >
              </div>
            </div>{/if}
        </section>
        {#if (groups.length || openingShare) && !mobile}<DayDetail
            schedules={live}
            {colors}
            {subgroupCatalog}
            {day}
            {mode}
            loading={busy}
            placeholder={openingShare}
          />{/if}
      {/if}
    </main>
    <footer>
      <a href="https://rasp.omgtu.ru" target="_blank" rel="noreferrer"
        >Источник расписания <Icon name="external" size={13} /></a
      >
    </footer>
  </div>
  {#if pwa.waiting}<aside class="pwa-update" role="status">
      <span>Доступно обновление приложения.</span>
      <button class="button" disabled={pwa.updating} onclick={updatePwa}
        >Обновить</button
      >
    </aside>{/if}

  <div class="toast-stack" aria-label="Уведомления">
    {#each toasts as toast (toast.id)}<Toast
        kind={toast.kind}
        message={toast.message}
        ondismiss={() => {
          toasts = toasts.filter((t) => t.id !== toast.id);
        }}
      />{/each}
  </div>
</Tooltip.Provider>

<style>
  .mobile-result {
    padding: 0 9px 9px;
  }
  .comparison {
    box-shadow: 4px 5px 0 var(--shadow);
    overflow: hidden;
  }
  .share-state {
    padding: 28px;
    min-height: 200px;
  }
  .welcome {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 42px;
    min-height: 320px;
    padding: 35px 20px;
  }
  .welcome h2 {
    font-size: 30px;
    letter-spacing: -1px;
  }
  .welcome p {
    color: var(--muted);
    font-size: 15px;
    line-height: 1.6;
    margin: 0 0 20px;
  }
  .example-button {
    display: block;
    margin-top: 16px;
    background: transparent;
    border: 0;
    color: var(--muted);
    font-size: 11px;
    text-decoration: underline;
    text-underline-offset: 4px;
  }
  @media (max-width: 700px) {
    .comparison {
      margin-inline: calc(-1 * var(--page-inset));
      border-inline: 0;
      border-radius: 0;
      box-shadow: none;
    }
    .welcome {
      min-height: 380px;
      flex-direction: column;
      text-align: center;
      gap: 16px;
      padding: 25px 15px;
    }
    .welcome > img {
      width: 135px;
      height: 135px;
    }
    .welcome h2 {
      font-size: 25px;
    }
    .welcome p {
      font-size: 13px;
      margin-bottom: 15px;
    }
    .example-button {
      margin-inline: auto;
    }
  }
</style>
