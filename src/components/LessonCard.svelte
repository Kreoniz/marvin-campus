<script lang="ts">
  import { Popover } from 'bits-ui';
  import { onDestroy } from 'svelte';
  import type { LessonBlock } from '../lib/lesson-layout.ts';
  import { colorStyle, type GroupColors } from '../lib/colors.ts';
  import { lessonKind } from '../lib/lesson-kind.ts';
  import { lessonGroupLabel } from '../lib/subgroups.ts';
  import type { Selection, Subgroup } from '../lib/types.ts';
  import { timeLabel } from '../lib/dates.ts';
  import { track } from '../lib/analytics.ts';
  import Hint from './Hint.svelte';
  import Icon from './Icon.svelte';
  let {
    block,
    colors,
    subgroupCatalog = {},
    style,
    active = false,
    onactive,
  }: {
    block: LessonBlock;
    colors: GroupColors;
    subgroupCatalog?: Record<number, Subgroup[]>;
    style: string;
    active?: boolean;
    onactive?: (identity: string | undefined) => void;
  } = $props();
  let lesson = $derived(block.lesson),
    shared = $derived(block.members.length > 1),
    events = $derived(block.parallel ?? [lesson]);
  let badges = $derived([
    ...new Map(
      events.map((event) => {
        const kind = lessonKind(event.kind) ?? {
          label: '?',
          tone: 'other',
          title: event.kind || 'Тип занятия не указан',
        };
        return [kind.label, kind] as const;
      }),
    ).values(),
  ]);
  const room = (event: typeof lesson) =>
    event.remote ? 'Онлайн' : event.room.trim() || 'Аудитория не указана';
  let place = $derived([...new Set(events.map(room))].join(' / '));
  const groupLabel = (group: Selection, lessons = events) =>
    lessonGroupLabel(group, lessons, subgroupCatalog[group.id] ?? []);
  let labels = $derived(block.members.map((g) => groupLabel(g)).join(', '));
  let open = $state(false),
    hovering = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => clearTimeout(timer);
  function enter(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    cancel();
    hovering = true;
    onactive?.(block.identity);
    timer = setTimeout(() => {
      open = true;
    }, 180);
  }
  function leave(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    cancel();
    timer = setTimeout(() => {
      if (hovering) open = false;
      onactive?.(undefined);
    }, 180);
  }
  onDestroy(cancel);
</script>

<div class="lesson-position" {style}>
  <Popover.Root bind:open>
    <Popover.Trigger
      style={colorStyle(colors[block.members[0].id] ?? 0)}
      class={`lesson-card ${shared ? 'shared-card' : ''} ${block.parallel ? 'parallel-card' : ''} ${events.every((event) => event.remote) ? 'remote-lesson' : ''} ${active ? 'linked-active' : ''}`}
      aria-label={`${shared ? 'Общая пара: ' : ''}${labels}, ${events.map((event) => `${event.subject}, ${event.kind}, ${room(event)}`).join('; ')}, ${timeLabel(lesson.start)}–${timeLabel(lesson.end)}${block.parallel ? '. Одновременные занятия одной группы.' : ''}${block.linked ? '. Участники показаны в отдельных связанных карточках.' : ''}`}
      onpointerenter={enter}
      onpointerleave={leave}
      onfocus={() => onactive?.(block.identity)}
      onblur={() => onactive?.(undefined)}
      onclick={() => {
        hovering = false;
        track('lesson_opened', { remote: lesson.remote });
      }}
    >
      {#if shared}<span class="participant-stripe" aria-hidden="true"
          >{#each block.members as group (group.id)}<span
              style={colorStyle(colors[group.id] ?? 0)}
            ></span>{/each}</span
        >{/if}
      <span class="card-heading"
        ><span class="card-subject"
          >{block.parallel
            ? `${events.length} занятия`
            : lesson.subject || 'Занятие'}</span
        >{#if block.linked}<span
            class="linked-mark"
            title={`Эта пара объединяет ${labels}`}
            >↔{block.members.length}</span
          >{/if}</span
      >
      <span class="participant-chips"
        >{#each block.shown as group (group.id)}<span
            class="participant-chip"
            style={colorStyle(colors[group.id] ?? 0)}>{groupLabel(group)}</span
          >{/each}</span
      >
      <span class="card-meta"
        ><span class="card-room">{place}</span>
        <span class="kind-badges"
          >{#each badges as kind}<span
              class="kind-badge"
              data-tone={kind.tone}
              title={kind.title}>{kind.label}</span
            >{/each}</span
        >
      </span>
    </Popover.Trigger>
    <Popover.Portal
      ><Popover.Content
        class="lesson-popover"
        sideOffset={7}
        onOpenAutoFocus={(event) => {
          if (hovering) event.preventDefault();
        }}
        onpointerenter={cancel}
        onpointerleave={leave}
      >
        <div class="popover-heading">
          <strong>{shared ? 'Общая пара' : groupLabel(block.members[0])}</strong
          ><Hint label="Закрыть подробности"
            >{#snippet children(props)}<Popover.Close
                {...props}
                class="icon-button"
                aria-label="Закрыть подробности"
                ><Icon name="close" size={16} /></Popover.Close
              >{/snippet}</Hint
          >
        </div>
        <p class="lesson-time">
          {timeLabel(lesson.start)}–{timeLabel(lesson.end)}
        </p>
        {#each events as event}<div class="lesson-description">
            <h3>{event.subject}</h3>
            {#if block.parallel}<div class="popover-participants">
                {#each block.members as group (group.id)}<span
                    class="participant-chip"
                    style={colorStyle(colors[group.id] ?? 0)}
                    >{groupLabel(group, [event])}</span
                  >{/each}
              </div>{/if}
            <p>{event.kind || 'Тип занятия не указан'} · {room(event)}</p>
            {#if event.teacher}<p>{event.teacher}</p>{/if}
          </div>{/each}
        {#if !block.parallel}<div class="popover-participants">
            {#each block.members as group (group.id)}<span
                class="participant-chip"
                style={colorStyle(colors[group.id] ?? 0)}
                >{groupLabel(group)}</span
              >{/each}
          </div>{/if}
        {#if block.parallel}<p class="common-label">
            {events.length} отдельных занятий одной группы идут одновременно. Подробности
            каждого занятия указаны выше.
          </p>{/if}
        {#if block.common}<p class="common-label">
            Общая пара всех выбранных групп
          </p>{:else if shared}<p class="common-label">
            Общая пара {block.members.length} групп.{#if block.linked}
              Участники в отдельных колонках отмечены ↔.{/if}
          </p>{/if}
      </Popover.Content></Popover.Portal
    >
  </Popover.Root>
</div>

<style>
  .lesson-position {
    position: absolute;
    z-index: 2;
    container-type: size;
  }
  :global(.lesson-card) {
    position: relative;
    width: 100%;
    height: 100%;
    border: 1px solid color-mix(in srgb, var(--chip) 65%, #384333);
    border-radius: 4px;
    background: var(--chip);
    color: #142016;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
    gap: 2px;
    padding: 5px;
    font-size: 11px;
    line-height: 1.2;
    overflow: hidden;
    text-align: left;
  }
  :global(.lesson-card.shared-card) {
    background: var(--surface);
    color: var(--ink);
    border-color: var(--line);
    padding-top: 7px;
    padding-bottom: 3px;
  }
  :global(.lesson-card:hover),
  :global(.lesson-card.linked-active) {
    box-shadow: 0 0 0 1px var(--ink);
  }
  :global(.lesson-card.parallel-card) {
    background: repeating-linear-gradient(
      135deg,
      var(--chip) 0 9px,
      color-mix(in srgb, var(--chip) 78%, white) 9px 18px
    );
  }
  :global(.lesson-card.remote-lesson) {
    border-style: dashed;
  }
  .participant-stripe {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 5px;
    display: flex;
  }
  .participant-stripe > span {
    flex: 1;
    background: var(--chip);
  }
  .card-heading {
    display: flex;
    gap: 3px;
    align-items: center;
    min-width: 0;
  }
  .card-subject {
    flex: 1;
    font-size: 11px;
    font-weight: 700;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .kind-badge {
    flex: none;
    font-size: 9px;
    font-weight: 600;
    padding: 2px 3px;
    border: 1px solid #14201640;
    border-radius: 3px;
    background: #f7f5ebc9;
    color: #142016;
  }
  .kind-badge[data-tone='lecture'] {
    background: #e0ecfc;
    border-color: #7194b9;
  }
  .kind-badge[data-tone='practice'] {
    background: #e1eed6;
    border-color: #789666;
  }
  .kind-badge[data-tone='lab'] {
    background: #e9def4;
    border-color: #9a7cad;
  }
  .kind-badge[data-tone='exam'],
  .kind-badge[data-tone='resit'] {
    background: #f5dbd3;
    border-color: #bc7a68;
  }
  .kind-badge[data-tone='credit'] {
    background: #f3e7bd;
    border-color: #ad934c;
  }
  .participant-chips,
  .popover-participants {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
    align-items: center;
  }
  .participant-chip {
    background: var(--chip);
    color: #142016;
    border: 1px solid color-mix(in srgb, var(--chip) 65%, #384333);
    font-size: 12px;
    font-weight: 650;
    line-height: 1.2;
    padding: 1px 3px;
    border-radius: 3px;
    white-space: nowrap;
  }
  .linked-mark {
    font-size: 11px;
    white-space: nowrap;
  }
  .card-meta {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    font-weight: 500;
    min-width: 0;
  }
  .card-room {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .kind-badges {
    display: flex;
    gap: 2px;
    flex: none;
  }
  .lesson-description + .lesson-description {
    border-top: 1px solid var(--grid);
    margin-top: 8px;
    padding-top: 8px;
  }
  :global(.lesson-popover) {
    width: min(320px, calc(100vw - 28px));
    padding: 12px;
    border: 1.5px solid var(--line);
    border-radius: 6px;
    background: var(--surface);
    color: var(--ink);
    box-shadow: 4px 5px 0 var(--shadow);
    z-index: 70;
    font-size: 12px;
    line-height: 1.4;
  }
  .popover-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 5px;
  }
  h3 {
    font-weight: 750;
    font-size: 15px;
    margin: 0 0 5px;
  }
  p {
    margin: 4px 0;
  }
  .lesson-time {
    font-size: 16px;
    font-weight: 700;
  }
  .common-label {
    border-top: 1px solid var(--grid);
    padding-top: 8px;
    color: var(--muted);
    font-size: 11px;
  }
  .popover-participants {
    margin: 8px 0;
  }
  @container (width < 95px) {
    .card-heading {
      flex-wrap: wrap;
      gap: 2px;
    }
    .card-subject {
      font-size: 10px;
    }
    .participant-chip {
      padding: 1px 2px;
      font-size: 11px;
    }
    :global(.lesson-card) {
      padding-inline: 3px;
      gap: 2px;
    }
    .card-meta {
      font-size: 10px;
    }
  }
  @container (height < 58px) {
    :global(.lesson-card) {
      padding: 3px;
      gap: 2px;
    }
    :global(.lesson-card.shared-card) {
      padding-top: 7px;
      padding-bottom: 2px;
    }
    .card-subject {
      font-size: 10px;
    }
    .participant-chip {
      padding: 1px 3px;
      font-size: 11px;
    }
    .kind-badge {
      padding: 1px 2px;
    }
    .participant-chips {
      flex-wrap: nowrap;
      overflow: hidden;
    }
  }
</style>
