<script lang="ts">
  import type { GroupSchedule } from '../lib/types.ts';
  import type { createComparisonLinks } from '../lib/comparison-links.svelte.ts';
  import IconButton from './IconButton.svelte';
  import Icon from './Icon.svelte';
  let {
    schedules,
    fetching,
    links,
  }: {
    schedules: GroupSchedule[];
    fetching: boolean;
    links: ReturnType<typeof createComparisonLinks>;
  } = $props();
  let warnings = $derived(
    schedules.filter((g) => g.error || g.snapshot?.stale),
  );
  let checked = $derived(
    schedules
      .flatMap((g) => (g.snapshot ? [g.snapshot.checkedAt] : []))
      .sort()[0],
  );
</script>

<div class="data-status">
  <span aria-live="polite"
    ><span class="status-message"
      >{fetching
        ? 'Загружаем расписания…'
        : checked
          ? `Снимок проверен ${new Intl.DateTimeFormat('ru-RU', { timeZone: 'Asia/Omsk', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(checked))}`
          : 'Расписание пока недоступно'}</span
    ><span class="timezone"> · Омск, UTC+6</span></span
  >
  <div>
    <IconButton
      label={links.sharing
        ? 'Копируем ссылку…'
        : 'Скопировать ссылку на сравнение'}
      disabled={links.sharing || links.opening}
      name="copy"
      size={17}
      onclick={links.copy}
    />
  </div>
</div>
{#if links.manual}<div class="manual-share">
    <label for="share-link">Ссылка на сравнение</label>
    <input
      id="share-link"
      readonly
      value={links.manual}
      onfocus={(event) => event.currentTarget.select()}
    />
    <button class="button" onclick={links.copyManual}>Копировать</button>
  </div>{/if}
{#if warnings.length}<div class="warning-banner" role="status">
    <Icon name="info" />
    <div>
      {#each warnings as warning}<p>
          <strong>{warning.selection.label}:</strong>
          {warning.error ??
            warning.snapshot?.warning}{#if warning.snapshot}<span>
              Проверен {new Intl.DateTimeFormat('ru-RU', {
                timeZone: 'Asia/Omsk',
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(warning.snapshot.checkedAt))}.</span
            >{/if}
        </p>{/each}
    </div>
  </div>{/if}

<style>
  .data-status {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    padding: 3px 10px 3px 14px;
    color: var(--muted);
    font-size: 10px;
    min-height: 46px;
  }
  .data-status > div {
    display: flex;
    gap: 2px;
  }
  .data-status > span {
    min-width: 0;
  }
  .status-message {
    display: inline-block;
    width: 220px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: bottom;
  }
  .manual-share {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--line);
  }
  .manual-share input {
    flex: 1 1 220px;
    min-width: 0;
    padding: 8px;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  .warning-banner {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    padding: 10px 14px;
    background: color-mix(in srgb, var(--yellow) 25%, var(--surface));
    border-block: 1px solid var(--highlight);
    font-size: 12px;
  }
  .warning-banner p {
    margin: 0 0 4px;
  }
  @media (max-width: 700px) {
    .timezone {
      display: none;
    }
    .data-status {
      font-size: 9px;
      padding-left: 9px;
    }
    .status-message {
      width: 180px;
    }
    .warning-banner {
      font-size: 11px;
      padding: 9px;
    }
  }
</style>
