<script lang="ts">
  import { Dialog, Combobox } from 'bits-ui';
  import { createQuery } from '@tanstack/svelte-query';
  import { groupOptions } from '../lib/queries.ts';
  import type { Group, Selection } from '../lib/types.ts';
  import Hint from './Hint.svelte';
  import Icon from './Icon.svelte';
  let {
    selected,
    onadd,
    onerror,
  }: {
    selected: Selection[];
    onadd: (group: Group) => void;
    onerror: (message: string) => void;
  } = $props();
  let open = $state(false),
    query = $state(''),
    debounced = $state('');
  let term = $derived(query.trim().toUpperCase());
  const search = createQuery(() => ({
    ...groupOptions(debounced),
    enabled: open && term.length >= 2 && term === debounced,
  }));
  let results = $derived(term === debounced ? (search.data?.data ?? []) : []);
  let loading = $derived(
    open && term.length >= 2 && (term !== debounced || search.isPending),
  );
  let error = $derived(term === debounced ? (search.error?.message ?? '') : '');
  let stale = $derived(term === debounced && !!search.data?.stale);
  let comboOpen = $state(true);
  const suggestions: Group[] = [
    { id: 373, label: 'ИВТ-241' },
    { id: 374, label: 'ИВТ-242' },
    { id: 375, label: 'ИВТ-243' },
  ];
  let visible = $derived(
    (query.trim().length < 2 ? suggestions : results).filter(
      (group) => !selected.some((s) => s.id === group.id),
    ),
  );
  $effect(() => {
    const value = term;
    if (!open || value.length < 2) {
      debounced = '';
      return;
    }
    const timer = setTimeout(() => {
      debounced = value;
    }, 300);
    return () => clearTimeout(timer);
  });
  let reportedError = 0;
  $effect(() => {
    if (open && error && search.errorUpdatedAt !== reportedError) {
      reportedError = search.errorUpdatedAt;
      onerror(error);
    }
  });
  function choose(value: string) {
    const group = visible.find((g) => String(g.id) === value);
    if (group) {
      onadd(group);
      open = false;
      query = '';
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Trigger
    class="button add-group"
    aria-label="Добавить группу"
    disabled={selected.length >= 30}
    ><Icon name="plus" /><span class="add-group-label">Группа</span
    ></Dialog.Trigger
  >
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content
      class="dialog-content group-dialog"
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        document.getElementById('group-search')?.focus();
      }}
    >
      <div class="dialog-heading">
        <Dialog.Title>Добавить группу</Dialog.Title><Hint label="Закрыть поиск"
          >{#snippet children(props)}<Dialog.Close
              {...props}
              class="icon-button"
              aria-label="Закрыть поиск"><Icon name="close" /></Dialog.Close
            >{/snippet}</Hint
        >
      </div>
      <Dialog.Description class="muted"
        >Найди свою группу или группу друга в расписании ОмГТУ.</Dialog.Description
      >
      <Combobox.Root
        type="single"
        value=""
        onValueChange={choose}
        bind:open={comboOpen}
        inputValue={query}
      >
        <label for="group-search" class="field-label">Название группы</label>
        <div class="search-field">
          <Icon name="search" /><Combobox.Input
            id="group-search"
            aria-label="Название группы"
            placeholder="Например, ИВТ-241"
            autocomplete="off"
            oninput={(e) => {
              query = e.currentTarget.value;
              comboOpen = true;
            }}
          />
        </div>
        <div class="group-results-slot">
          <Combobox.ContentStatic class="group-results">
            {#each visible as group (group.id)}
              <Combobox.Item
                value={String(group.id)}
                label={group.label}
                class="group-result"
                ><strong>{group.label}</strong><span
                  >{group.description ?? 'ОмГТУ'}</span
                ><Icon name="plus" /></Combobox.Item
              >
            {/each}
          </Combobox.ContentStatic>
        </div>
      </Combobox.Root>
      <p class="search-status" role="status">
        {loading
          ? 'Ищем группы…'
          : error ||
            (stale
              ? 'Поиск по сохранённому снимку: источник временно недоступен.'
              : query.trim().length >= 2 && !visible.length
                ? 'Группы не найдены. Попробуй другое название.'
                : query.trim().length < 2
                  ? 'Для поиска введи хотя бы 2 символа.'
                  : '')}
      </p>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>

<style>
  .field-label {
    display: block;
    margin: 16px 0 7px;
    font-size: 12px;
    font-weight: 700;
  }
  .search-field {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1.5px solid var(--line);
    border-radius: 4px;
    padding: 10px 12px;
  }
  .search-field :global(input) {
    width: 100%;
    background: transparent;
    border: 0;
    outline: none;
    font-size: 16px;
  }
  .search-field:focus-within {
    outline: 3px solid var(--highlight);
    outline-offset: 2px;
  }
  .group-results-slot {
    margin-top: 14px;
    height: clamp(120px, calc(100dvh - 300px), 290px);
  }
  :global(.group-results) {
    height: 100%;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  :global(.group-result) {
    position: relative;
    border-bottom: 1px solid var(--grid);
    padding: 12px 28px 12px 9px;
    cursor: pointer;
  }
  :global(.group-result) strong {
    display: block;
    font-size: 14px;
  }
  :global(.group-result) span {
    display: block;
    margin-top: 3px;
    font-size: 10px;
    color: var(--muted);
  }
  :global(.group-result > svg) {
    position: absolute;
    right: 4px;
    top: 13px;
  }
  :global(.group-result[data-highlighted]) {
    background: var(--sage);
    color: #162413;
  }
  :global(.group-result[data-highlighted]) span {
    color: #31422c;
  }
  .search-status {
    min-height: 36px;
    line-height: 18px;
    font-size: 12px;
    color: var(--muted);
    margin: 14px 0 0;
  }
  :global(.group-result) {
    transition:
      background-color 140ms ease,
      color 140ms ease,
      border-color 140ms ease,
      box-shadow 140ms ease,
      opacity 140ms ease,
      transform 140ms ease;
  }
</style>
