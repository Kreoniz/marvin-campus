<script lang="ts">
  import type { GroupSchedule, Mode } from '../lib/types.ts';
  import { formatDay, timeLabel } from '../lib/dates.ts';
  import { compareDay, lessonsFor } from '../lib/domain.ts';
  let {
    schedules,
    day,
    loading,
    mode,
    compact = false,
    placeholder = false,
  }: {
    schedules: GroupSchedule[];
    day: string;
    loading: boolean;
    mode: Mode;
    compact?: boolean;
    placeholder?: boolean;
  } = $props();
  let result = $derived(compareDay(schedules, day));
  let hasLessons = $derived(
    schedules.some((g) => lessonsFor(g).some((l) => l.date === day)),
  );
  let ranges = $derived(mode === 'free' ? result.free : result.presence);
  let saved = $derived(
    schedules.some((g) => g.snapshot && (g.snapshot.stale || g.error)),
  );
  let hasSnapshot = $derived(schedules.some((g) => g.snapshot));
</script>

<aside
  class="marvin-card"
  class:compact-summary={compact}
  aria-label="Результат сравнения"
  aria-busy={loading}
>
  {#if !compact}<img
      src="/assets/marvin.webp"
      width="150"
      height="150"
      alt="Марвин задумался над расписанием"
    />{/if}
  <div class="marvin-result">
    <p class="summary-date">
      {#if placeholder}<span
          class="skeleton summary-date-placeholder"
          aria-hidden="true"
        ></span>{:else}{formatDay(day, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}{/if}
    </p>
    {#if loading && !hasSnapshot}
      <div class="summary-skeleton" aria-hidden="true">
        <span class="skeleton"></span><span class="skeleton"></span>
      </div>
      <span class="sr-only">Загружаем результат сравнения.</span>
    {:else if schedules.length < 2}<strong>Твоё расписание</strong>
      <p>Добавь группу друга — найдём время пересечься.</p>
    {:else if !result.complete}<strong>Нужны все расписания</strong>
      <p>Без данных одной из групп сравнение не получится.</p>
    {:else if !hasLessons}<strong>На этот день занятий нет.</strong>
      <p>Выбери другой день — проверим общее время.</p>
    {:else if compact}
      <strong
        >{mode === 'free' ? 'Все без занятий' : 'Общее время в вузе'}</strong
      >
      <p class="result-time">
        {ranges.length
          ? ranges
              .map((i) => `${timeLabel(i.start)}–${timeLabel(i.end)}`)
              .join(', ')
          : mode === 'free'
            ? 'Нет общего времени без занятий'
            : 'Нет общего времени'}
      </p>
      {#if mode === 'presence' && result.free.length}<p>
          Без занятий: {result.free
            .map((i) => `${timeLabel(i.start)}–${timeLabel(i.end)}`)
            .join(', ')}
        </p>{/if}
    {:else}
      <strong>Общее время в вузе:</strong>
      <p class="result-time">
        {result.presence.length
          ? result.presence
              .map((i) => `${timeLabel(i.start)}–${timeLabel(i.end)}`)
              .join(', ')
          : 'Нет общего времени'}
      </p>
      <strong>Все без занятий:</strong>
      <p class="result-time">
        {result.free.length
          ? result.free
              .map((i) => `${timeLabel(i.start)}–${timeLabel(i.end)}`)
              .join(', ')
          : 'Нет общего времени без занятий'}
      </p>
      {#if result.lessons.length}<span class="shared-count"
          >Общих пар: {result.lessons.length}</span
        >{/if}
    {/if}
    <p class="saved-qualification">
      {saved
        ? 'По сохранённым данным'
        : result.complete
          ? 'По расписанию'
          : '\u00a0'}
    </p>
  </div>
  {#if !compact}<p class="marvin-caption">
      {result.free.length
        ? 'Даже у вселенной бывают окна.'
        : 'Время — иллюзия. Расписание — чуть сложнее.'}
    </p>{/if}
</aside>

<style>
  .marvin-card.compact-summary {
    width: 100%;
    min-height: 86px;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    padding: 9px 12px;
    gap: 0;
    align-items: center;
    background: color-mix(in srgb, var(--sage) 24%, var(--surface));
    color: var(--ink);
    border: 1px solid var(--grid);
  }
  .compact-summary .marvin-result .result-time {
    font-size: 16px;
    margin: 4px 0;
  }
  .compact-summary .marvin-result > strong {
    font-size: 13px;
  }
  .compact-summary .marvin-result > p {
    font-size: 12px;
  }
  .compact-summary .summary-date {
    display: none;
  }
  .marvin-result .saved-qualification {
    color: var(--muted);
    font-size: 11px;
    margin: 5px 0 0;
  }
  .marvin-card {
    flex: 0 0 340px;
    display: grid;
    grid-template-columns: 112px minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr) 32px;
    align-content: stretch;
    align-items: center;
    gap: 8px 12px;
    min-height: 182px;
    background: var(--yellow);
    border: 1px solid #cca945;
    border-radius: 4px;
    color: #1d2118;
    padding: 16px;
  }
  .marvin-card > img {
    width: 112px;
    height: 112px;
    object-fit: contain;
  }
  .marvin-result {
    position: relative;
    font-size: 12px;
    line-height: 1.25;
    align-self: start;
  }
  .marvin-result strong {
    font-size: 11px;
    font-weight: 750;
  }
  .marvin-result p {
    margin: 4px 0 11px;
  }
  .marvin-result .result-time {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.6px;
  }
  .marvin-result .summary-date {
    margin: 0 0 8px;
    font-size: 10px;
    font-weight: 650;
    text-transform: capitalize;
  }
  .marvin-caption {
    grid-column: 1 / -1;
    border-top: 1px solid #5b552f;
    margin: 0;
    padding-top: 6px;
    text-align: right;
    font-size: 9px;
    height: 32px;
    line-height: 12px;
  }
  @media (max-width: 1100px) {
    .marvin-card {
      flex-basis: 300px;
      grid-template-columns: 96px 1fr;
      padding: 14px;
    }
    .marvin-card > img {
      width: 96px;
      height: 96px;
    }
  }
  @media (max-width: 700px) {
    .marvin-card {
      flex-basis: auto;
      min-height: 172px;
      grid-template-columns: 112px 1fr;
      padding: 16px;
    }
    .marvin-card > img {
      width: 112px;
      height: 112px;
    }
    .marvin-result .result-time {
      font-size: 16px;
    }
    .marvin-caption {
      font-size: 9px;
    }
  }
  .summary-skeleton {
    display: grid;
    gap: 12px;
  }
  .summary-skeleton .skeleton {
    height: 16px;
    background: #81732b28;
  }
  .summary-skeleton .skeleton:last-child {
    width: 65%;
  }
  .summary-date-placeholder {
    display: inline-block;
    vertical-align: middle;
  }
  .summary-date-placeholder {
    width: 75px;
    height: 12px;
  }
</style>
