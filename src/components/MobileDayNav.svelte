<script lang="ts">
  import type { ComparisonView } from '../lib/comparison-view.svelte.ts';
  import { addDays, formatDay, omskToday } from '../lib/dates.ts';
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
</script>

<div class="mobile-view-controls" inert={opening}>
  <button class="today-button" onclick={() => view.selectDate(omskToday())}
    >Сегодня</button
  >
  <div role="group" aria-label="Представление расписания">
    <button
      class:active={mobileView === 'day'}
      aria-pressed={mobileView === 'day'}
      onclick={() => (mobileView = 'day')}>День</button
    ><button
      class:active={mobileView === 'week'}
      aria-pressed={mobileView === 'week'}
      onclick={() => (mobileView = 'week')}>Неделя</button
    >
  </div>
</div>
<nav class="agenda-days" aria-label="Дни недели" inert={opening}>
  {#each weekDates as date}<button
      class:selected={!opening && view.day === date}
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

<style>
  .mobile-view-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px 8px;
  }
  .mobile-view-controls > div {
    display: flex;
    border: 1px solid var(--grid);
    border-radius: 5px;
    overflow: hidden;
  }
  .mobile-view-controls button {
    min-height: 36px;
    border: 0;
    background: transparent;
    padding: 6px 12px;
    font-size: 12px;
  }
  .mobile-view-controls button.active {
    background: var(--sage);
    color: #18211a;
  }
  .today-button {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .agenda-days {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 3px;
    padding: 0 10px 10px;
  }
  .agenda-days button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 3px;
    min-height: 48px;
    height: 54px;
    padding: 5px 0;
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
</style>
