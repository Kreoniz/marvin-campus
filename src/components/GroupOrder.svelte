<script lang="ts">
  import { tick } from 'svelte';
  import { Dialog } from 'bits-ui';
  import type { Selection } from '../lib/types.ts';
  import { colorStyle, type GroupColors } from '../lib/colors.ts';
  import Icon from './Icon.svelte';
  import IconButton from './IconButton.svelte';
  let {
    groups,
    colors,
    open = $bindable(false),
    onmove,
    returnFocus,
  }: {
    groups: Selection[];
    colors: GroupColors;
    open?: boolean;
    onmove: (id: number, offset: number) => void;
    returnFocus: number;
  } = $props();
  let announcement = $state('');
  async function move(group: Selection, index: number, offset: number) {
    onmove(group.id, offset);
    announcement = `${group.label}: позиция ${index + offset + 1} из ${groups.length}.`;
    await tick();
    const row = document.querySelector<HTMLElement>(
      `.order-list [data-group-id="${group.id}"]`,
    );
    const arrows = row?.querySelectorAll<HTMLButtonElement>('button');
    const preferred = arrows?.[offset < 0 ? 0 : 1];
    (preferred && !preferred.disabled
      ? preferred
      : Array.from(arrows ?? []).find((button) => !button.disabled)
    )?.focus();
    row?.scrollIntoView({ block: 'nearest' });
  }
</script>

<Dialog.Root bind:open
  ><Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content
      class="dialog-content order-dialog"
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        document
          .querySelector<HTMLButtonElement>(`[data-drag-id="${returnFocus}"]`)
          ?.focus();
      }}
    >
      <div class="dialog-heading">
        <Dialog.Title>Порядок групп</Dialog.Title>
        <Dialog.Close class="icon-button" aria-label="Закрыть порядок групп"
          ><Icon name="close" /></Dialog.Close
        >
      </div>
      <Dialog.Description
        >Поменяй порядок групп в списке. Цвета и расположение пар в календаре
        останутся прежними.</Dialog.Description
      >
      <ol class="order-list">
        {#each groups as group, index (group.id)}<li
            data-group-id={group.id}
            style={colorStyle(colors[group.id] ?? 0)}
          >
            <span class="order-number">{index + 1}</span><strong
              >{group.label}</strong
            >
            <IconButton
              label={`Переместить ${group.label} выше`}
              name="up"
              disabled={index === 0}
              onclick={() => move(group, index, -1)}
            />
            <IconButton
              label={`Переместить ${group.label} ниже`}
              name="down"
              disabled={index === groups.length - 1}
              onclick={() => move(group, index, 1)}
            />
          </li>{/each}
      </ol>
      <p class="sr-only" aria-live="polite">{announcement}</p>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root
>
