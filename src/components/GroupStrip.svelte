<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { flip } from 'svelte/animate';
  import { mergeProps } from 'bits-ui';
  import type { GroupSchedule, Selection, Subgroup } from '../lib/types.ts';
  import { mergeSubgroups } from '../lib/subgroups.ts';
  import { colorStyle, type GroupColors } from '../lib/colors.ts';
  import { motionDuration } from '../lib/motion.ts';
  import SubgroupPicker from './SubgroupPicker.svelte';
  import IconButton from './IconButton.svelte';
  import Hint from './Hint.svelte';
  let {
    groups,
    schedules,
    subgroupCatalog,
    colors,
    onremove,
    onsubgroup,
    onreorder,
    onorder,
  }: {
    groups: Selection[];
    schedules: GroupSchedule[];
    subgroupCatalog: Record<number, Subgroup[]>;
    colors: GroupColors;
    onremove: (id: number) => void;
    onsubgroup: (id: number, value?: number) => void;
    onreorder: (groups: Selection[]) => void;
    onorder: (id: number) => void;
  } = $props();
  let scroller: HTMLDivElement;
  let preview = $state<Selection[] | undefined>();
  let shown = $derived(preview ?? groups);
  let drag = $state<{
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
  }>();
  let announcement = $state('');
  let pointer:
    | {
        id: number;
        group: Selection;
        button: HTMLButtonElement;
        capture: HTMLElement;
        x: number;
        y: number;
        rect: DOMRect;
      }
    | undefined;
  let lastX = 0,
    lastY = 0,
    frame = 0,
    suppressClick = false;

  function start(event: PointerEvent, group: Selection) {
    if (groups.length < 2 || event.button !== 0 || !event.isPrimary) return;
    const button = event.currentTarget as HTMLButtonElement;
    pointer = {
      id: event.pointerId,
      group,
      button,
      capture: button,
      x: event.clientX,
      y: event.clientY,
      rect: button.closest('.group-chip')!.getBoundingClientRect(),
    };
    button.setPointerCapture(event.pointerId);
    lastX = event.clientX;
    lastY = event.clientY;
    suppressClick = false;
  }
  function position() {
    if (!pointer || !drag) return;
    const bounds = scroller.getBoundingClientRect();
    if (lastX < bounds.left + 28) scroller.scrollLeft -= 7;
    else if (lastX > bounds.right - 28) scroller.scrollLeft += 7;
    updatePreview();
    frame = requestAnimationFrame(position);
  }
  function updatePreview() {
    if (!pointer || !drag) return;
    const x =
      lastX - scroller.getBoundingClientRect().left + scroller.scrollLeft;
    const others = Array.from(
      scroller.querySelectorAll<HTMLElement>('.group-chip'),
    ).filter((el) => Number(el.dataset.groupId) !== pointer!.group.id);
    const target = others.filter(
      (el) => x > el.offsetLeft + el.offsetWidth / 2,
    ).length;
    const next = shown.filter((group) => group.id !== pointer!.group.id);
    next.splice(target, 0, pointer.group);
    if (next.some((group, index) => group.id !== shown[index].id))
      preview = next;
  }
  function move(event: PointerEvent) {
    if (!pointer || pointer.id !== event.pointerId) return;
    lastX = event.clientX;
    lastY = event.clientY;
    if (!drag && Math.hypot(lastX - pointer.x, lastY - pointer.y) < 6) return;
    event.preventDefault();
    const first = !drag;
    drag = {
      id: pointer.group.id,
      x: pointer.rect.left + lastX - pointer.x,
      y: pointer.rect.top + lastY - pointer.y,
      width: pointer.rect.width,
      height: pointer.rect.height,
    };
    if (first) {
      // The button moves during keyed reordering. Capture on the stable strip
      // after the threshold, so a normal tap still activates the button.
      scroller.setPointerCapture(event.pointerId);
      pointer.capture = scroller;
      preview = groups.slice();
      suppressClick = true;
      frame = requestAnimationFrame(position);
    }
  }
  async function finish(commit: boolean) {
    if (!pointer) return;
    if (commit) updatePreview();
    const group = pointer.group;
    const next = preview;
    cancelAnimationFrame(frame);
    if (pointer.capture.hasPointerCapture(pointer.id))
      pointer.capture.releasePointerCapture(pointer.id);
    pointer = undefined;
    drag = undefined;
    preview = undefined;
    if (commit && next && next.some((g, i) => g.id !== groups[i]?.id)) {
      onreorder(next);
      announcement = `${group.label}: позиция ${next.findIndex((g) => g.id === group.id) + 1} из ${next.length}.`;
      await tick();
      scroller
        .querySelector<HTMLButtonElement>(`[data-drag-id="${group.id}"]`)
        ?.focus({ preventScroll: true });
    }
  }
  function end(event: PointerEvent) {
    if (pointer?.id === event.pointerId) {
      lastX = event.clientX;
      void finish(event.type === 'pointerup');
    }
  }
  function cancel(event: KeyboardEvent) {
    if (event.key === 'Escape' && pointer) {
      event.preventDefault();
      void finish(false);
    }
  }
  async function keyboard(event: KeyboardEvent, group: Selection) {
    if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key))
      return;
    event.preventDefault();
    const from = groups.findIndex((g) => g.id === group.id);
    const target = from + (event.key === 'ArrowLeft' ? -1 : 1);
    if (target < 0 || target >= groups.length) return;
    const next = groups.slice();
    next.splice(from, 1);
    next.splice(target, 0, group);
    onreorder(next);
    announcement = `${group.label}: позиция ${target + 1} из ${next.length}.`;
    await tick();
    scroller
      .querySelector<HTMLButtonElement>(`[data-drag-id="${group.id}"]`)
      ?.focus({ preventScroll: true });
  }
  onDestroy(() => {
    cancelAnimationFrame(frame);
  });
</script>

<svelte:window
  onpointermove={move}
  onpointerup={end}
  onpointercancel={end}
  onkeydown={cancel}
  onblur={() => finish(false)}
/>
<div
  class="group-controls"
  class:dragging={!!drag}
  bind:this={scroller}
  role="group"
  aria-label="Выбранные группы"
>
  {#each shown as group (group.id)}
    {@const loaded = schedules.find((g) => g.selection.id === group.id)}
    <div
      class="group-chip"
      class:drag-source={drag?.id === group.id}
      data-group-id={group.id}
      style={colorStyle(colors[group.id] ?? 0)}
      animate:flip={{ duration: motionDuration(drag ? 100 : 160) }}
    >
      <div class="chip-heading">
        <Hint
          label={groups.length > 1
            ? 'Перетащи для перестановки. Нажми — порядок кнопками.'
            : group.label}
        >
          {#snippet children(props)}
            <button
              {...mergeProps(props, {
                onpointerdown: (event: PointerEvent) => start(event, group),
                onkeydown: (event: KeyboardEvent) => keyboard(event, group),
                onclick: (event: MouseEvent) => {
                  if (suppressClick && event.detail !== 0) {
                    event.preventDefault();
                    suppressClick = false;
                    return;
                  }
                  if (groups.length > 1) onorder(group.id);
                },
              })}
              class="group-drag"
              data-drag-id={group.id}
              aria-label={`Порядок группы ${group.label}`}
              aria-describedby="group-drag-help">{group.label}</button
            >
          {/snippet}
        </Hint>
        <IconButton
          class="chip-remove"
          label={`Убрать ${group.label}`}
          name="close"
          size={13}
          onclick={() => onremove(group.id)}
        />
      </div>
      <SubgroupPicker
        label={group.label}
        subgroups={mergeSubgroups(
          subgroupCatalog[group.id] ?? [],
          loaded?.snapshot?.data.subgroups ?? [],
        )}
        value={group.subgroup}
        subgroupNumber={group.subgroupNumber}
        onchange={(value) => onsubgroup(group.id, value)}
      />
    </div>
  {/each}
</div>
{#if drag}
  {@const draggingId = drag.id}
  {@const group = groups.find((g) => g.id === draggingId)!}
  <div
    class="group-chip drag-ghost"
    aria-hidden="true"
    style={`${colorStyle(colors[drag.id] ?? 0)};left:${drag.x}px;top:${drag.y}px;width:${drag.width}px;height:${drag.height}px`}
  >
    <strong>{group.label}</strong><span
      >{group.subgroup
        ? (subgroupCatalog[group.id]?.find((item) => item.id === group.subgroup)
            ?.label ??
          (group.subgroupNumber
            ? `${group.label}/${group.subgroupNumber}`
            : 'Выбранная подгруппа'))
        : group.subgroupNumber
          ? `${group.label}/${group.subgroupNumber}`
          : 'Вся группа'}</span
    >
  </div>
{/if}
<span id="group-drag-help" class="sr-only"
  >Перетащи название группы. Нажми, чтобы менять порядок кнопками. С клавиатуры:
  Alt и стрелки влево или вправо.</span
>
<span class="sr-only" aria-live="polite">{announcement}</span>

<style>
  .group-controls {
    position: relative;
    display: flex;
    align-items: center;
    gap: 9px;
    overflow-x: auto;
    overflow-y: hidden;
    min-width: 0;
    scrollbar-width: thin;
    padding: 4px;
    height: 77px;
  }
  .group-controls > * {
    flex: none;
  }
  .group-chip {
    width: 116px;
    min-width: 116px;
    border: 1px solid color-mix(in srgb, var(--chip) 70%, var(--line));
    border-radius: 4px;
    padding: 2px 5px;
    color: #19201b;
    background: var(--chip);
  }
  .chip-heading {
    display: flex;
    gap: 2px;
    align-items: center;
    justify-content: space-between;
  }
  .group-drag {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    border: 0;
    background: transparent;
    padding: 2px 0;
    min-height: 24px;
    font-size: 13px;
    font-weight: 750;
    white-space: nowrap;
    touch-action: none;
    cursor: grab;
  }
  .group-controls.dragging .group-drag {
    cursor: grabbing;
  }
  .drag-source {
    opacity: 0.35;
  }
  .drag-ghost {
    position: fixed;
    z-index: 120;
    pointer-events: none;
    user-select: none;
    box-shadow: 3px 5px 16px #0003;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    font-size: 12px;
  }
  .drag-ghost span {
    font-size: 11px;
  }
  .chip-heading :global(.chip-remove) {
    border: 0;
    background: transparent;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    padding: 0;
    border-radius: 3px;
  }
  .chip-heading :global(.chip-remove:hover) {
    background: #0001;
  }
  @media (max-width: 700px) {
    .group-controls {
      gap: 8px;
    }
    .group-chip {
      min-width: 116px;
      padding: 2px 5px;
    }
    .chip-heading {
      gap: 5px;
    }
    .chip-heading :global(.chip-remove) {
      width: 28px;
      height: 28px;
    }
  }
  @media (max-width: 700px) {
    .group-controls {
      flex: 1;
    }
  }
</style>
