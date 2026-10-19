<script lang="ts">
  import { Popover } from 'bits-ui';
  import { track } from '../lib/analytics.ts';
  import type { ComparisonView } from '../lib/comparison-view.svelte.ts';
  import { addDays, formatDay, omskToday, weekLabel } from '../lib/dates.ts';
  import DatePicker from './DatePicker.svelte';
  import Icon from './Icon.svelte';
  let {
    view,
    opening,
    mobileView = $bindable('day'),
  }: {
    view: ComparisonView;
    opening: boolean;
    mobileView?: 'day' | 'week';
  } = $props();
  let weekDates = $derived(
    Array.from({ length: 7 }, (_, i) => addDays(view.week, i)),
  );
  let dateOpen = $state(false);
  let lastDay = $derived(addDays(view.week, 6));
  let shortWeek = $derived(
    view.week.slice(0, 7) === lastDay.slice(0, 7)
      ? `${Number(view.week.slice(8))}–${formatDay(lastDay, { day: 'numeric', month: 'short' })}`
      : `${formatDay(view.week, { day: 'numeric', month: 'short' })}–${formatDay(lastDay, { day: 'numeric', month: 'short' })}`,
  );
  function selectDate(value: string) {
    view.selectDate(value);
    dateOpen = false;
  }
  function selectView(value: 'day' | 'week') {
    if (mobileView === value) return;
    mobileView = value;
    track('mobile_view_changed', { view: value });
  }
</script>

<div class="mobile-view-controls" inert={opening}>
  <div class="mobile-week-controls" data-schedule-week>
    <button
      class="week-arrow"
      aria-label="Предыдущая неделя"
      onclick={() => view.selectWeek(addDays(view.week, -7))}
      ><Icon name="left" size={17} /></button
    >
    <Popover.Root bind:open={dateOpen}>
      <Popover.Trigger
        class="mobile-date"
        aria-label={`Выбрать дату. ${weekLabel(view.week)}`}
      >
        <span>{shortWeek}</span><Icon name="down" size={12} />
      </Popover.Trigger>
      <Popover.Portal
        ><Popover.Content class="week-popover" sideOffset={6}
          ><DatePicker day={view.day} onselect={selectDate} /></Popover.Content
        ></Popover.Portal
      >
    </Popover.Root>
    <button
      class="week-arrow"
      aria-label="Следующая неделя"
      onclick={() => view.selectWeek(addDays(view.week, 7))}
      ><Icon name="right" size={17} /></button
    >
    <button class="today-button" onclick={() => view.selectDate(omskToday())}
      >Сегодня</button
    >
  </div>
  <div class="view-toggle" role="group" aria-label="Представление расписания">
    <button
      class:active={mobileView === 'day'}
      aria-pressed={mobileView === 'day'}
      onclick={() => selectView('day')}>День</button
    ><button
      class:active={mobileView === 'week'}
      aria-pressed={mobileView === 'week'}
      onclick={() => selectView('week')}>Неделя</button
    >
  </div>
</div>
<nav
  class="agenda-days"
  data-schedule-days
  aria-label="Дни недели"
  inert={opening}
>
  {#each weekDates as date}<button
      class:selected={!opening && view.day === date}
      data-schedule-day={date}
      aria-pressed={!opening && view.day === date}
      aria-label={formatDay(date, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })}
      onclick={() => view.selectDay(date)}
      >{#if opening}<span
          class="skeleton day-label-placeholder"
          aria-hidden="true"
        ></span>{:else}<span>{formatDay(date, { weekday: 'short' })}</span
        ><strong>{Number(date.slice(8))}</strong>{/if}</button
    >{/each}
</nav>
{#if view.groups.length >= 2}
  <div
    class="mobile-modes"
    role="group"
    aria-label="Режим сравнения"
    inert={opening}
  >
    <button
      class:active={view.mode === 'presence'}
      aria-pressed={view.mode === 'presence'}
      onclick={() => view.selectMode('presence')}>В вузе</button
    >
    <button
      class:active={view.mode === 'free'}
      aria-pressed={view.mode === 'free'}
      onclick={() => view.selectMode('free')}>Без занятий</button
    >
  </div>
{/if}

<style>
  .mobile-view-controls {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 6px;
  }
  .mobile-week-controls {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  .mobile-view-controls button,
  .mobile-view-controls :global(.mobile-date) {
    min-height: 44px;
    min-width: 0;
    border: 0;
    background: transparent;
    padding: 6px 4px;
    color: var(--ink);
    font-size: 11px;
  }
  .week-arrow {
    display: grid;
    place-items: center;
    flex: 0 0 28px;
  }
  :global(.mobile-date) {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    flex: 1;
    white-space: nowrap;
    font-weight: 650;
  }
  :global(.mobile-date > span) {
    white-space: normal;
    line-height: 1.15;
    text-wrap: balance;
  }
  :global(.mobile-date > svg) {
    flex: none;
  }
  .view-toggle {
    display: flex;
    flex: none;
    border: 1px solid var(--grid);
    border-radius: 5px;
    background: var(--page);
  }
  .view-toggle button {
    padding-inline: 7px;
    border-radius: 4px;
  }
  .view-toggle button.active {
    background: var(--sage);
    color: #172214;
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .today-button {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .agenda-days {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 2px;
    padding: 0 8px 4px;
  }
  .agenda-days button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 1px;
    min-height: 44px;
    height: 44px;
    padding: 3px 0;
    border: 1px solid transparent;
    border-radius: 5px;
    background: transparent;
    font-size: 11px;
  }
  .agenda-days button strong {
    font-size: 15px;
  }
  .agenda-days button.selected {
    border-color: var(--line);
    background: color-mix(in srgb, var(--sage) 40%, var(--surface));
  }
  .mobile-modes {
    display: flex;
    margin: 4px 9px 0;
    border: 1px solid var(--line);
    border-radius: 5px;
    overflow: hidden;
  }
  .mobile-modes button {
    flex: 1;
    min-height: 40px;
    background: transparent;
    border: 0;
    font-size: 12px;
  }
  .mobile-modes button + button {
    border-left: 1px solid var(--grid);
  }
  .mobile-modes button.active {
    background: var(--sage);
    color: #172214;
  }
</style>
