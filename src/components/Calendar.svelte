<script lang="ts">
  import { tick, untrack } from 'svelte';
  import type { GroupSchedule, Mode, Subgroup } from '../lib/types.ts';
  import { addDays, formatDay, timeLabel } from '../lib/dates.ts';
  import { compareDay, presenceFor } from '../lib/domain.ts';
  import { colorStyle, type GroupColors } from '../lib/colors.ts';
  import { lessonBlocks } from '../lib/lesson-layout.ts';
  import LessonCard from './LessonCard.svelte';
  let {
    schedules,
    colors,
    subgroupCatalog = {},
    week,
    day,
    mode,
    loading,
    onday,
    singleDay = false,
    placeholder = false,
  }: {
    schedules: GroupSchedule[];
    colors: GroupColors;
    subgroupCatalog?: Record<number, Subgroup[]>;
    week: string;
    day: string;
    mode: Mode;
    loading: boolean;
    onday: (day: string) => void;
    singleDay?: boolean;
    placeholder?: boolean;
  } = $props();
  let activeIdentity = $state<string>();
  let scroller: HTMLDivElement;
  let viewportWidth = $state(innerWidth);
  let dates = $derived(
    singleDay ? [day] : Array.from({ length: 7 }, (_, i) => addDays(week, i)),
  );
  let scale = $derived(singleDay ? 0.65 : 0.72);
  let all = $derived(schedules.flatMap((g) => g.snapshot?.data.lessons ?? []));
  // Keep the same clock scale across weeks; unusual source times extend it once.
  let start = $state(480),
    end = $state(1140);
  $effect(() => {
    if (loading) return;
    const earliest = Math.min(
      480,
      ...all.map((l) => Math.floor(l.start / 60) * 60),
    );
    const latest = Math.max(
      1140,
      ...all.map((l) => Math.ceil(l.end / 60) * 60),
    );
    untrack(() => {
      start = Math.min(start, earliest);
      end = Math.max(end, latest);
    });
  });
  let hours = $derived(
    Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60),
  );
  let height = $derived((end - start) * scale);
  let complete = $derived(schedules.every((g) => g.snapshot));
  let layout = $derived(
    dates.map((date) => ({
      date,
      result: compareDay(schedules, date),
      placed: lessonBlocks(schedules, date),
      presence: presenceFor(schedules, date),
    })),
  );
  // Each visible event keeps a readable width, including parallel sublanes.
  let overlapWidth = $derived(
    Math.max(
      144,
      schedules.length * 80,
      ...layout.flatMap((column) =>
        column.placed.map((block) => 80 / block.width),
      ),
    ),
  );
  $effect(() => {
    const index = dates.indexOf(day);
    const width = viewportWidth;
    if (singleDay) return;
    tick().then(() => {
      if (!scroller) return;
      const column = scroller.querySelector<HTMLElement>('.day-column');
      if (column)
        scroller.scrollTo({
          left:
            width <= 700
              ? Math.max(0, index) * column.offsetWidth
              : Math.max(
                  0,
                  (index + 1) * column.offsetWidth + 48 - scroller.clientWidth,
                ),
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
        });
    });
  });
</script>

<svelte:window bind:innerWidth={viewportWidth} />

<!-- svelte-ignore a11y_no_noninteractive_tabindex (Focus enables native keyboard scrolling.) -->
<div
  class="week-scroll"
  class:day-view={singleDay}
  bind:this={scroller}
  tabindex="0"
  role="region"
  style={`--calendar-viewport:${660 * scale}px;--calendar-header:${singleDay ? 36 : 44}px`}
  aria-label={singleDay
    ? `Расписание на ${formatDay(day, { day: 'numeric', month: 'long' })}. Время слева, одновременно идущие пары рядом.`
    : 'Недельное расписание. На узком экране прокручивается горизонтально.'}
  aria-busy={loading}
>
  <div
    class="week-grid"
    style={`--calendar-height:${height}px;--hour-height:${60 * scale}px;--overlap-min:${overlapWidth}px;--day-count:${dates.length}`}
  >
    <div class="time-header"></div>
    {#each dates as date}<button
        class:selected={!placeholder && day === date}
        class="day-heading"
        disabled={placeholder}
        aria-pressed={!placeholder && day === date}
        aria-label={formatDay(date, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}
        onclick={() => onday(date)}
        >{#if placeholder}<span
            class="skeleton day-label-placeholder"
            aria-hidden="true"
          ></span>{:else}<span>{formatDay(date, { weekday: 'short' })}</span>
          {Number(date.slice(8))}{/if}</button
      >{/each}
    <div class="time-rail">
      {#each hours as hour}<span style={`top:${(hour - start) * scale}px`}
          >{timeLabel(hour)}</span
        >{/each}
    </div>
    {#each layout as column (column.date)}
      {@const highlights =
        mode === 'presence' ? column.result.presence : column.result.free}
      <div
        class="day-column"
        class:chosen={!placeholder && column.date === day}
      >
        {#if loading && !schedules.some((g) => g.snapshot)}
          <div class="calendar-skeleton" aria-hidden="true">
            {#each placeholder ? [] : [0, 1, 2] as index}<div
                class="skeleton"
                style={`top:${(45 + index * 180) * scale}px;height:${(index === 1 ? 150 : 95) * scale}px;left:${index % 2 ? 18 : 6}%;right:6%`}
              ></div>{/each}
          </div>
        {:else}
          {#each column.presence as presence}<div
              class="presence-fill"
              style={`${colorStyle(colors[presence.group] ?? 0)};top:${(presence.range.start - start) * scale}px;height:${(presence.range.end - presence.range.start) * scale}px;left:${(schedules.findIndex((g) => g.selection.id === presence.group) * 100) / Math.max(schedules.length, 1)}%;width:${100 / Math.max(schedules.length, 1)}%`}
            ></div>{/each}
          {#each highlights as range}<div
              class="shared-highlight"
              class:free-highlight={mode === 'free'}
              style={`top:${(range.start - start) * scale}px;height:${(range.end - range.start) * scale}px`}
            ></div>{/each}
          {#each column.placed as block (`${block.identity}:${block.left}`)}
            <LessonCard
              {block}
              {colors}
              {subgroupCatalog}
              active={activeIdentity === block.identity}
              onactive={(identity) => (activeIdentity = identity)}
              style={`top:${(block.lesson.start - start) * scale}px;height:${Math.max((block.lesson.end - block.lesson.start) * scale - 3, 18)}px;left:calc(${block.left * 100}% + 3px);width:calc(${block.width * 100}% - 6px)`}
            />
          {/each}
          {#if !column.placed.length}<div class="empty-column">
              <span>{!complete ? 'Ждём данные' : 'Нет занятий'}</span
              >{#if complete}<img
                  src="/assets/planet.webp"
                  alt=""
                  width="52"
                  height="52"
                />{/if}
            </div>{/if}
        {/if}
      </div>
    {/each}
  </div>
</div>
<p class="calendar-hint">
  <span class="mode-legend" class:free-legend={mode === 'free'}
    >{mode === 'presence'
      ? 'Полоса — общее время в вузе'
      : 'Зелёные полосы — свободны все'}</span
  ><span class="lesson-hint">
    Цветная полоска — общая пара, ↔ — связанные части. Диагональные полосы —
    одновременные занятия одной группы. Подробности по нажатию.{#if !singleDay || overlapWidth + 46 > viewportWidth - 40}<span
        class="mobile-hint"
      >
        {singleDay
          ? 'Группы можно прокручивать →'
          : 'Дни можно прокручивать →'}</span
      >{/if}
  </span>
</p>

<style>
  button:active:not(:disabled):not(.day-heading) {
    transform: translateY(1px);
  }
  :global([data-theme='dark']) .empty-column img {
    filter: invert(1);
  }
  .week-scroll {
    overflow-anchor: none;
    overflow: auto;
    height: calc(var(--calendar-viewport) + var(--calendar-header) + 8px);
    scrollbar-gutter: stable;
    scrollbar-width: thin;
    --day-base: 80px;
    --rail-width: 48px;
  }
  .week-grid {
    --day-min: max(var(--day-base), var(--overlap-min));
    display: grid;
    grid-template-columns: var(--rail-width) repeat(
        var(--day-count, 7),
        minmax(var(--day-min), 1fr)
      );
    grid-template-rows: 44px var(--calendar-height);
    min-width: calc(var(--rail-width) + var(--day-count, 7) * var(--day-min));
  }
  .week-scroll.day-view {
    --day-base: 0px;
  }
  .day-view .week-grid {
    grid-template-rows: 36px var(--calendar-height);
  }
  .time-header {
    position: sticky;
    left: 0;
    background: var(--surface);
    z-index: 5;
    border-bottom: 1px solid var(--grid);
  }
  .day-heading {
    font-size: 14px;
    font-weight: 700;
    border: 0;
    border-bottom: 1px solid var(--grid);
    border-right: 1px solid var(--grid);
    background: transparent;
    text-transform: capitalize;
  }
  .day-heading.selected {
    background: var(--sage);
    color: #142012;
    box-shadow: inset 0 0 0 1.5px var(--line);
  }
  .time-rail {
    position: sticky;
    left: 0;
    z-index: 4;
    background: var(--surface);
  }
  .time-rail span {
    position: absolute;
    right: 6px;
    font-size: 10px;
    transform: translateY(-50%);
  }
  .time-rail span:first-child {
    transform: translateY(2px);
  }
  .time-rail span:last-child {
    transform: translateY(-100%);
  }
  .day-column {
    position: relative;
    border-right: 1px solid var(--grid);
    background: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent calc(var(--hour-height) - 1px),
      var(--grid) calc(var(--hour-height) - 1px),
      var(--grid) var(--hour-height)
    );
  }
  .day-column.chosen {
    background-color: color-mix(in srgb, var(--sage) 5%, transparent);
  }
  .presence-fill {
    position: absolute;
    background: color-mix(
      in srgb,
      var(--chip) var(--presence-strength),
      transparent
    );
    border-inline: 1px solid color-mix(in srgb, var(--chip) 40%, transparent);
    pointer-events: none;
  }
  .shared-highlight {
    position: absolute;
    left: 1px;
    right: 1px;
    border-left: 2px solid var(--highlight);
    background: color-mix(in srgb, var(--yellow) 18%, transparent);
    z-index: 1;
    pointer-events: none;
  }
  .free-highlight {
    border-block: 1px solid #85a474;
    background: color-mix(in srgb, var(--sage) 55%, transparent);
    border-color: #85a474;
  }
  .empty-column {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 12px;
    text-align: center;
    color: var(--muted);
    font-size: 12px;
    padding: 10px;
  }
  .empty-column img {
    opacity: 0.55;
  }
  .calendar-hint :global(svg) {
    display: inline-block;
    vertical-align: -2px;
  }
  .calendar-hint {
    margin: 0;
    padding: 10px 14px;
    border-top: 1px solid var(--grid);
    font-size: 11px;
    color: var(--muted);
  }
  .mobile-hint {
    display: none;
  }
  @media (max-width: 700px) {
    .week-scroll {
      --day-base: calc((100vw - 74px) / 2);
      --rail-width: 46px;
    }
    .day-heading {
      font-size: 13px;
    }
    .calendar-hint {
      font-size: 9px;
      padding: 9px;
      line-height: 1.5;
    }
    .mobile-hint {
      display: inline;
    }
  }
  .shared-highlight {
    transition: background-color 160ms ease;
  }
  .mode-legend {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-right: 12px;
  }
  .mode-legend::before {
    content: '';
    width: 9px;
    height: 9px;
    border-left: 2px solid var(--highlight);
    background: var(--yellow);
  }
  .free-legend::before {
    background: var(--sage);
    border-color: #85a474;
  }
  .lesson-hint {
    display: inline;
  }
  .calendar-skeleton {
    position: absolute;
    inset: 0;
  }
  .calendar-skeleton .skeleton {
    position: absolute;
  }
</style>
