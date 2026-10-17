<script lang="ts">
  import { Popover } from 'bits-ui';
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
  let checked = $derived(
    schedules
      .flatMap((g) => (g.snapshot ? [g.snapshot.checkedAt] : []))
      .sort()[0],
  );
  let saved = $derived(
    schedules.some((g) => g.snapshot && (g.snapshot.stale || g.error)),
  );
  let missing = $derived(schedules.some((g) => !g.snapshot && !g.loading));
  const checkedLabel = (value: string) =>
    new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Asia/Omsk',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  let message = $derived(
    fetching
      ? saved
        ? 'Проверяем… · сохранённые данные'
        : checked
          ? 'Проверяем обновления…'
          : 'Загружаем расписания…'
      : missing
        ? 'Часть расписаний недоступна'
        : saved
          ? `Сохранённые данные${checked ? ` · ${checkedLabel(checked)}` : ''}`
          : checked
            ? `Проверено ${checkedLabel(checked)}`
            : 'Расписание недоступно',
  );
</script>

<div class="data-status">
  <span class="status-message" role="status" aria-atomic="true">
    {#if saved}<Icon name="clock" size={13} />{/if}
    <span
      title={checked
        ? `${message}. Проверено ${checkedLabel(checked)}. Омск, UTC+6.`
        : message}>{message}<span class="timezone"> · Омск, UTC+6</span></span
    >
  </span>
  <div class="status-actions">
    <Popover.Root>
      <Popover.Trigger
        class="icon-button status-details"
        aria-label="Состояние данных расписания"
      >
        <Icon name="info" size={17} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content class="data-details" sideOffset={6}>
          <div class="data-details-heading">
            <strong>Данные расписания</strong><Popover.Close
              class="icon-button"
              aria-label="Закрыть состояние данных"
              ><Icon name="close" size={16} /></Popover.Close
            >
          </div>
          <p>
            Время по Омску, UTC+6. Сохранённые данные могут отличаться от
            текущего расписания.
          </p>
          {#each schedules as group (group.selection.id)}
            <div class="group-data-status">
              <strong>{group.selection.label}</strong>
              <p>
                {group.error ??
                  group.snapshot?.warning ??
                  (group.loading
                    ? 'Загружаем расписание…'
                    : group.snapshot?.stale
                      ? 'Показаны сохранённые данные.'
                      : group.snapshot
                        ? 'Данные актуальны.'
                        : 'Нет сохранённых данных.')}
              </p>
              {#if group.snapshot}<p>
                  Проверено {checkedLabel(group.snapshot.checkedAt)}.
                </p>{/if}
            </div>
          {/each}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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

<style>
  .data-status {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    align-items: center;
    padding: 3px 10px 3px 14px;
    color: var(--muted);
    font-size: 11px;
    height: 44px;
  }
  .status-actions {
    display: flex;
    gap: 2px;
    flex: none;
  }
  .data-status > span {
    min-width: 0;
  }
  .status-message {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }
  .status-message > span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  :global(.data-details) {
    width: min(360px, calc(100vw - 32px));
    max-height: min(420px, calc(100dvh - 40px));
    overflow-y: auto;
    padding: 14px;
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--line);
    border-radius: 6px;
    box-shadow: 3px 4px 0 var(--shadow);
    z-index: 45;
    font-size: 12px;
  }
  .data-details-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  :global(.data-details) p {
    color: var(--muted);
    line-height: 1.5;
    margin: 4px 0;
  }
  .group-data-status {
    border-top: 1px solid var(--grid);
    margin-top: 10px;
    padding-top: 10px;
  }
  @media (max-width: 700px) {
    .timezone {
      display: none;
    }
    .data-status {
      padding-left: 9px;
    }
  }
</style>
