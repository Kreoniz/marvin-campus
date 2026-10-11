<script lang="ts">
  import { Select } from 'bits-ui';
  import type { Subgroup } from '../lib/types.ts';
  import Icon from './Icon.svelte';
  let {
    label,
    subgroups,
    value,
    subgroupNumber,
    onchange,
  }: {
    label: string;
    subgroups: Subgroup[];
    value?: number;
    subgroupNumber?: number;
    onchange: (value?: number) => void;
  } = $props();
  let currentLabel = $derived(
    value
      ? (subgroups.find((s) => s.id === value)?.label ??
          (subgroupNumber
            ? `${label}/${subgroupNumber}`
            : 'Выбранная подгруппа'))
      : subgroupNumber
        ? `${label}/${subgroupNumber}`
        : 'Вся группа',
  );
</script>

<Select.Root
  type="single"
  value={value ? String(value) : subgroupNumber ? 'pending' : 'all'}
  onValueChange={(v) => {
    if (v !== 'pending') onchange(v === 'all' ? undefined : Number(v));
  }}
>
  <Select.Trigger
    class="subgroup-trigger"
    aria-label={`Подгруппа ${label}: ${currentLabel}`}
    >{currentLabel}<Icon name="down" size={12} /></Select.Trigger
  >
  <Select.Portal
    ><Select.Content class="select-content" sideOffset={6}>
      <Select.Item value="all" label="Вся группа" class="select-item"
        >Вся группа</Select.Item
      >
      {#if !value && subgroupNumber}<Select.Item
          value="pending"
          label={currentLabel}
          class="select-item"
          disabled>{currentLabel}</Select.Item
        >{/if}
      {#if value && !subgroups.some((item) => item.id === value)}
        <Select.Item
          value={String(value)}
          label={currentLabel}
          class="select-item">{currentLabel}</Select.Item
        >
      {/if}
      {#each subgroups as subgroup (subgroup.id)}<Select.Item
          value={String(subgroup.id)}
          label={subgroup.label}
          class="select-item">{subgroup.label}</Select.Item
        >{/each}
    </Select.Content></Select.Portal
  >
</Select.Root>

<style>
  :global(.subgroup-trigger) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: 12px;
    line-height: 1.2;
    background: transparent;
    border: 0;
    padding: 4px 0;
    min-height: 24px;
    width: 100%;
    max-width: 180px;
  }
</style>
