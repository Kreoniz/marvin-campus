<script lang="ts">
  import { Popover } from 'bits-ui';
  import type { ComparisonView } from '../lib/comparison-view.svelte.ts';
  import type { GroupSchedule, Mode, Subgroup } from '../lib/types.ts';
  import type { GroupColors } from '../lib/colors.ts';
  import { addDays, weekLabel } from '../lib/dates.ts';
  import GroupStrip from './GroupStrip.svelte';
  import GroupPicker from './GroupPicker.svelte';
  import IconButton from './IconButton.svelte';
  import Icon from './Icon.svelte';
  import DatePicker from './DatePicker.svelte';
  let {
    view,
    schedules,
    subgroupCatalog,
    colors,
    opening,
    onorder,
    onerror,
  }: {
    view: ComparisonView;
    schedules: GroupSchedule[];
    subgroupCatalog: Record<number, Subgroup[]>;
    colors: GroupColors;
    opening: boolean;
    onorder: (id: number) => void;
    onerror: (message: string) => void;
  } = $props();
  let weekOpen = $state(false);
  const modes: { value: Mode; label: string }[] = [
    { value: 'presence', label: 'В вузе' },
    { value: 'free', label: 'Без занятий' },
  ];
  function selectWeek(value: string) {
    view.selectWeek(value);
    weekOpen = false;
  }
  function selectDate(value: string) {
    view.selectDate(value);
    weekOpen = false;
  }
  const selectMode = (value: Mode) => view.selectMode(value);
</script>

<div class="toolbar" inert={opening}>
  <div class="group-strip">
    {#if opening}<div
        class="group-controls group-placeholders"
        aria-hidden="true"
      >
        {#each [0, 1] as _}<div class="skeleton group-placeholder"></div>{/each}
      </div>{:else}
      <GroupStrip
        groups={view.groups}
        {schedules}
        {subgroupCatalog}
        {colors}
        onremove={view.remove}
        onsubgroup={view.subgroup}
        onreorder={view.reorder}
        onorder={(id) => {
          onorder(id);
        }}
      />
    {/if}
    <GroupPicker selected={view.groups} onadd={view.add} {onerror} />
  </div>
  <div class="view-controls">
    <div class="week-controls" data-schedule-week>
      <IconButton
        label="Предыдущая неделя"
        name="left"
        onclick={() => selectWeek(addDays(view.week, -7))}
      /><Popover.Root bind:open={weekOpen}
        ><Popover.Trigger class="button week-button"
          ><Icon name="calendar" /><span
            >{#if opening}<span
                class="skeleton week-label-placeholder"
                aria-hidden="true"
              ></span>{:else}{weekLabel(view.week)}{/if}</span
          ><Icon name="down" size={16} /></Popover.Trigger
        ><Popover.Portal
          ><Popover.Content class="week-popover" sideOffset={8}
            ><DatePicker day={view.day} onselect={selectDate} />
          </Popover.Content></Popover.Portal
        ></Popover.Root
      ><IconButton
        label="Следующая неделя"
        name="right"
        onclick={() => selectWeek(addDays(view.week, 7))}
      />
    </div>
    {#if view.groups.length >= 2}<div
        class="mode-controls"
        role="group"
        aria-label="Режим сравнения"
      >
        {#each modes as item}<button
            class:active={!opening && view.mode === item.value}
            aria-pressed={!opening && view.mode === item.value}
            onclick={() => selectMode(item.value)}>{item.label}</button
          >{/each}
      </div>{/if}
  </div>
</div>

<style>
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 15px;
    padding: 14px;
    border-bottom: 1px solid var(--grid);
  }
  .group-strip {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
    flex: 1 1 320px;
  }
  .view-controls {
    display: flex;
    gap: 11px;
    align-items: center;
    flex-wrap: wrap;
  }
  .week-controls {
    display: flex;
    align-items: center;
    gap: 1px;
  }
  :global(.week-button) {
    width: 218px;
    gap: 10px;
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) 16px;
  }
  :global(.week-button > span) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mode-controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 260px;
    max-width: 100%;
    border: 1px solid var(--line);
    border-radius: 4px;
    overflow: hidden;
  }
  .mode-controls button {
    min-width: 0;
    padding: 11px 10px;
    font-size: 11px;
    border: 0;
    border-right: 1px solid var(--grid);
    background: transparent;
    min-height: 39px;
    white-space: nowrap;
  }
  .mode-controls button:last-child {
    border-right: 0;
  }
  .mode-controls button.active {
    background: var(--sage);
    color: #172214;
    box-shadow: inset 0 0 0 1px #293a27;
  }
  .toolbar[inert] :global(.add-group) {
    visibility: hidden;
  }
  @media (min-width: 1100px) {
    .toolbar {
      flex-wrap: nowrap;
    }
    .group-strip {
      flex: 1;
    }
    .view-controls {
      flex: none;
    }
  }
  @media (max-width: 1100px) {
    .toolbar {
      gap: 12px;
    }
    .view-controls {
      width: 100%;
      justify-content: space-between;
    }
  }
  @media (max-width: 700px) {
    .toolbar {
      padding: 4px 8px;
      gap: 0;
    }
    .group-strip {
      width: 100%;
      flex-basis: 100%;
    }
    .view-controls {
      display: none;
    }
    .week-controls {
      width: 100%;
      justify-content: space-between;
    }
    :global(.week-button) {
      width: 190px;
    }
    .mode-controls {
      width: 100%;
    }
    .mode-controls button {
      font-size: clamp(10px, 2.8vw, 11px);
      padding: 12px 3px;
    }
  }
  .group-placeholders {
    display: flex;
    align-items: center;
    gap: 9px;
    height: 77px;
    padding: 4px;
    overflow: hidden;
    flex: 0 1 auto;
    width: 249px;
  }
  .group-placeholder {
    width: 116px;
    height: 57px;
  }
  .week-label-placeholder {
    display: inline-block;
    vertical-align: middle;
  }
  .week-label-placeholder {
    width: 128px;
    height: 14px;
  }
  @media (max-width: 700px) {
    .group-strip > :global(.add-group) {
      width: 44px;
      height: 44px;
      min-height: 44px;
      padding: 0;
    }
    .group-strip > :global(.add-group) :global(.add-group-label) {
      display: none;
    }
  }
</style>
