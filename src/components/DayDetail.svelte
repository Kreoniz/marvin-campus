<script lang="ts">
  import type { GroupSchedule, Mode, Subgroup } from '../lib/types.ts';
  import { formatDay, timeLabel } from '../lib/dates.ts';
  import { compareDay } from '../lib/domain.ts';
  import { lessonBlocks } from '../lib/lesson-layout.ts';
  import type { GroupColors } from '../lib/colors.ts';
  import LessonCard from './LessonCard.svelte';
  import ComparisonSummary from './ComparisonSummary.svelte';
  let {
    schedules,
    colors,
    subgroupCatalog = {},
    day,
    mode,
    loading,
    placeholder = false,
  }: {
    schedules: GroupSchedule[];
    colors: GroupColors;
    subgroupCatalog?: Record<number, Subgroup[]>;
    day: string;
    mode: Mode;
    loading: boolean;
    placeholder?: boolean;
  } = $props();
  let result = $derived(compareDay(schedules, day));
  let saved = $derived(
    schedules.some(
      (group) => group.snapshot && (group.snapshot.stale || group.error),
    ),
  );
  let placed = $derived(lessonBlocks(schedules, day));
  // Use the whole week's clock so selecting another day keeps the same axis.
  let all = $derived(schedules.flatMap((g) => g.snapshot?.data.lessons ?? []));
  let start = $derived(
    Math.min(480, ...all.map((l) => Math.floor(l.start / 60) * 60)),
  );
  let end = $derived(
    Math.max(1140, ...all.map((l) => Math.ceil(l.end / 60) * 60)),
  );
  let hours = $derived(
    Array.from({ length: (end - start) / 60 + 1 }, (_, i) => start + i * 60),
  );
  let rows = $derived(Math.max(1, ...placed.map((block) => block.columns)));
  // Reserve the week's peak event count, so changing the day doesn't move
  // the footer while empty group lanes disappear from the timeline.
  let weekRows = $derived(
    Math.max(
      1,
      ...[...new Set(all.map((l) => l.date))].flatMap((date) =>
        lessonBlocks(schedules, date).map((block) => block.columns),
      ),
    ),
  );
  const rowHeight = 68;
  let panelHeight = $derived(
    Math.max(252, Math.min(496, weekRows * rowHeight + 104)),
  );
  let highlights = $derived(
    mode === 'presence' ? result.presence : result.free,
  );
</script>

<section
  class="day-detail panel"
  aria-busy={loading}
  aria-labelledby="day-title"
  style={`--detail-height:${panelHeight}px`}
>
  <div class="day-main">
    <h2 id="day-title">
      {#if placeholder}<span
          class="skeleton detail-title-placeholder"
          aria-hidden="true"
        ></span><span class="sr-only">Загружаем выбранный день</span
        >{:else}{formatDay(day, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })}{/if}
    </h2>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (Focus enables native keyboard scrolling.) -->
    <div
      class="day-scroll"
      tabindex="0"
      role="region"
      aria-label="Подробное расписание выбранного дня"
    >
      <div
        class="day-timeline"
        style={`height:${rows * rowHeight + 40}px;--day-divisions:${(end - start) / 30}`}
      >
        {#each hours as hour}<span
            class="day-hour"
            style={`left:${((hour - start) * 100) / (end - start)}%`}
            >{timeLabel(hour)}</span
          >{/each}
        {#if loading && !schedules.some((g) => g.snapshot)}<div
            class="day-skeleton"
            aria-hidden="true"
          >
            {#each Array.from({ length: rows }) as _, index}<div
                class="skeleton"
                style={`top:${index * rowHeight + 36}px;left:8%;width:72%;height:${rowHeight - 6}px`}
              ></div>{/each}
          </div>{:else}
          {#each highlights as range}<div
              class="day-highlight"
              class:free-highlight={mode === 'free'}
              class:saved-highlight={saved}
              aria-hidden="true"
              style={`left:${((range.start - start) * 100) / (end - start)}%;width:${((range.end - range.start) * 100) / (end - start)}%`}
            ></div>{/each}
          {#each placed as block (block.identity)}<LessonCard
              {block}
              {colors}
              {subgroupCatalog}
              horizontal
              style={`left:calc(${((block.lesson.start - start) * 100) / (end - start)}% + 2px);width:calc(${((block.lesson.end - block.lesson.start) * 100) / (end - start)}% - 4px);top:${block.column * rowHeight + 36}px;height:${rowHeight - 6}px`}
            />{/each}
          {#if !placed.length}<p class="day-empty">
              {schedules.some((g) => g.error && !g.snapshot)
                ? 'Часть расписаний недоступна.'
                : schedules.some((g) => !g.snapshot)
                  ? 'Ждём данные расписания.'
                  : 'В этот день занятий нет.'}
              {#if saved && schedules.every((group) => group.snapshot)}<span
                  >По сохранённым данным</span
                >{/if}
            </p>{/if}
        {/if}
      </div>
    </div>
  </div>
  <ComparisonSummary {schedules} {day} {mode} {loading} {placeholder} />
</section>

<style>
  .day-detail {
    overflow-anchor: none;
    display: flex;
    gap: 14px;
    margin-top: 17px;
    padding: 12px;
    height: var(--detail-height);
  }
  .day-detail > :global(.marvin-card) {
    min-height: 0;
    overflow-y: auto;
    scrollbar-gutter: stable;
  }
  .day-main {
    flex: 1;
    min-width: 0;
  }
  #day-title::first-letter {
    text-transform: uppercase;
  }
  #day-title {
    line-height: 24px;
    height: 24px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .day-scroll {
    overflow-x: auto;
    overflow-y: auto;
    scrollbar-width: thin;
    padding-inline: 16px;
    height: calc(var(--detail-height) - 64px);
    scrollbar-gutter: stable;
  }
  .day-timeline {
    min-width: 740px;
    max-width: 1080px;
    position: relative;
    background: repeating-linear-gradient(
      to right,
      transparent,
      transparent calc(100% / var(--day-divisions) - 1px),
      var(--grid) calc(100% / var(--day-divisions) - 1px),
      var(--grid) calc(100% / var(--day-divisions))
    );
  }
  .day-hour {
    position: absolute;
    top: 1px;
    font-size: 11px;
    transform: translateX(-50%);
    background: var(--surface);
    z-index: 1;
  }
  .day-highlight {
    position: absolute;
    top: 29px;
    bottom: 4px;
    background: color-mix(in srgb, var(--yellow) 25%, transparent);
    border-top: 2px solid var(--highlight);
  }
  .day-highlight.free-highlight {
    background: color-mix(in srgb, var(--sage) 55%, transparent);
    border-color: #85a474;
  }
  .day-highlight.saved-highlight {
    background: color-mix(in srgb, var(--sage) 18%, transparent);
    border-top-style: dashed;
  }
  .day-empty > span {
    display: block;
    margin-top: 5px;
    font-size: 11px;
  }
  .day-empty {
    position: absolute;
    top: 45px;
    left: 12px;
    font-size: 13px;
    color: var(--muted);
  }
  @media (max-width: 700px) {
    .day-detail {
      flex-direction: column;
      padding: 10px;
      gap: 13px;
      margin-top: 15px;
    }
  }
  .day-highlight {
    transition: background-color 160ms ease;
  }
  .day-skeleton {
    position: absolute;
    inset: 0;
  }
  .day-skeleton .skeleton {
    position: absolute;
  }

  .detail-title-placeholder {
    display: inline-block;
    vertical-align: middle;
  }
  .detail-title-placeholder {
    width: min(220px, 100%);
    height: 20px;
  }
</style>
