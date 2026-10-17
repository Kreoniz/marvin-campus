<script lang="ts">
  import { Popover } from 'bits-ui';
  import { onDestroy } from 'svelte';
  import type { LessonBlock } from '../lib/lesson-layout.ts';
  import { colorStyle, type GroupColors } from '../lib/colors.ts';
  import { lessonKind } from '../lib/lesson-kind.ts';
  import { lessonGroupLabel } from '../lib/subgroups.ts';
  import { lessonKey } from '../lib/domain.ts';
  import type { Lesson, Selection, Subgroup } from '../lib/types.ts';
  import { timeLabel } from '../lib/dates.ts';
  import { track } from '../lib/analytics.ts';
  import Hint from './Hint.svelte';
  import Icon from './Icon.svelte';
  let {
    block,
    colors,
    subgroupCatalog = {},
    style,
    horizontal = false,
  }: {
    block: LessonBlock;
    colors: GroupColors;
    subgroupCatalog?: Record<number, Subgroup[]>;
    style: string;
    horizontal?: boolean;
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
  function groupLabel(group: Selection, event?: Lesson) {
    const own = block.memberLessons[group.id] ?? [];
    return lessonGroupLabel(
      group,
      event
        ? own.filter((source) => lessonKey(source) === lessonKey(event))
        : own,
      subgroupCatalog[group.id] ?? [],
    );
  }
  const savedMember = (group: Selection) =>
    block.staleMembers.includes(group.id);
  let labels = $derived(
    block.members
      .map(
        (g) =>
          `${groupLabel(g)}${savedMember(g) ? ' (сохранённые данные)' : ''}`,
      )
      .join(', '),
  );
  let saved = $derived(block.staleMembers.length > 0);
  let allSaved = $derived(block.staleMembers.length === block.members.length);
  let visibleMembers = $derived(
    block.members.length > 3 ? block.members.slice(0, 2) : block.members,
  );
  let long = $derived(lesson.end - lesson.start >= 240);
  function groupParts(group: Selection) {
    const label = groupLabel(group),
      split = label.lastIndexOf('-');
    return split > 0
      ? { name: label.slice(0, split), number: label.slice(split + 1) }
      : { name: label, number: '' };
  }
  let open = $state(false),
    hovering = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => clearTimeout(timer);
  function enter(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    cancel();
    hovering = true;
    timer = setTimeout(() => {
      open = true;
    }, 180);
  }
  function leave(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    cancel();
    timer = setTimeout(() => {
      if (hovering) open = false;
    }, 180);
  }
  onDestroy(cancel);
</script>

<div class="lesson-position" class:horizontal class:long {style}>
  <Popover.Root bind:open>
    <Popover.Trigger
      style={colorStyle(colors[block.members[0].id] ?? 0)}
      class={`lesson-card ${shared ? 'shared-card' : ''} ${long ? 'long-lesson' : ''} ${block.parallel ? 'parallel-card' : ''} ${events.every((event) => event.remote) ? 'remote-lesson' : ''} ${allSaved ? 'saved-card' : ''}`}
      aria-label={`${shared ? 'Общая пара: ' : ''}${labels}, ${events.map((event) => `${event.subject}, ${event.kind}, ${room(event)}`).join('; ')}, ${timeLabel(lesson.start)}–${timeLabel(lesson.end)}${block.parallel ? '. Одновременные занятия одной группы.' : ''}`}
      onpointerenter={enter}
      onpointerleave={leave}
      onclick={() => {
        hovering = false;
        track('lesson_opened', { remote: lesson.remote });
      }}
    >
      {#if shared && long}<span class="participant-stripe" aria-hidden="true"
          >{#each block.members as group (group.id)}<span
              class:saved-participant={savedMember(group)}
              style={colorStyle(colors[group.id] ?? 0)}
            ></span>{/each}</span
        >{/if}
      <span class="card-heading"
        ><span class="card-subject"
          >{block.parallel
            ? `${events.length} занятия`
            : lesson.subject || 'Занятие'}</span
        ></span
      >
      {#if long && !horizontal}<span class="card-time"
          >{timeLabel(lesson.start)}–{timeLabel(lesson.end)}</span
        >{/if}
      {#if shared}<span class="participant-sectors">
          {#each visibleMembers as group (group.id)}
            {@const parts = groupParts(group)}
            <span
              class="participant-sector"
              class:saved-participant={savedMember(group)}
              style={colorStyle(colors[group.id] ?? 0)}
              title={`${groupLabel(group)}${savedMember(group) ? ' · сохранённые данные' : ''}`}
            >
              {#if horizontal && long}<span class="group-name"
                  >{groupLabel(group)}{#if savedMember(group)}<Icon
                      name="clock"
                      size={10}
                    />{/if}</span
                >
              {:else}<span class="group-prefix">{parts.name}</span>
                {#if parts.number}<span class="group-number"
                    >{parts.number}{#if savedMember(group)}<Icon
                        name="clock"
                        size={10}
                      />{/if}</span
                  >{/if}
                {#if !parts.number && savedMember(group)}<Icon
                    name="clock"
                    size={10}
                  />{/if}
              {/if}
            </span>
          {/each}
          {#if visibleMembers.length < block.members.length}<span
              class="more-participants"
              title={labels}
              >+{block.members.length - visibleMembers.length}</span
            >{/if}
        </span>
      {:else}<span class="single-group"
          ><span>{groupLabel(block.members[0])}</span>{#if saved}<Icon
              name="clock"
              size={12}
            />{/if}</span
        >{/if}
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
                    class:saved-participant={savedMember(group)}
                    style={colorStyle(colors[group.id] ?? 0)}
                    >{groupLabel(group, event)}{#if savedMember(group)}<Icon
                        name="clock"
                        size={12}
                      /><span class="sr-only">
                        — сохранённые данные</span
                      >{/if}</span
                  >{/each}
              </div>{/if}
            <p>{event.kind || 'Тип занятия не указан'} · {room(event)}</p>
            {#if event.teacher}<p>{event.teacher}</p>{/if}
          </div>{/each}
        {#if !block.parallel}<div class="popover-participants">
            {#each block.members as group (group.id)}<span
                class="participant-chip"
                class:saved-participant={savedMember(group)}
                style={colorStyle(colors[group.id] ?? 0)}
                >{groupLabel(group)}{#if savedMember(group)}<Icon
                    name="clock"
                    size={12}
                  /><span class="sr-only">
                    — сохранённые данные</span
                  >{/if}</span
              >{/each}
          </div>{/if}
        {#if saved}<p class="saved-lesson-note">
            <Icon name="clock" size={13} />По сохранённым данным: {block.members
              .filter(savedMember)
              .map((group) => group.label)
              .join(', ')}.
          </p>{/if}
        {#if block.parallel}<p class="common-label">
            {events.length} отдельных занятий одной группы идут одновременно. Подробности
            каждого занятия указаны выше.
          </p>{/if}
        {#if block.common}<p class="common-label">
            Общая пара всех выбранных групп
          </p>{:else if shared}<p class="common-label">
            Общая пара {block.members.length} групп.
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
    padding: 0;
    gap: 0;
  }
  :global(.lesson-card:hover),
  :global(.lesson-card:focus-visible) {
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
  :global(.lesson-card.saved-card:not(.shared-card)) {
    background: color-mix(in srgb, var(--chip) 25%, var(--saved-card));
    color: var(--saved-card-ink);
    border-color: var(--saved-card-line);
  }
  :global(.lesson-card.saved-card.parallel-card) {
    background: repeating-linear-gradient(
      135deg,
      color-mix(in srgb, var(--chip) 25%, var(--saved-card)) 0 9px,
      var(--saved-card) 9px 18px
    );
  }
  :global(.lesson-card.saved-card.shared-card) {
    border-color: color-mix(in srgb, var(--line) 55%, var(--grid));
  }
  .participant-sector.saved-participant,
  .participant-chip.saved-participant,
  .participant-stripe > .saved-participant {
    background: color-mix(in srgb, var(--chip) 25%, var(--saved-card));
    color: var(--saved-card-ink);
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
  :global(.shared-card) .card-heading {
    padding: 1px 4px;
  }
  .card-time {
    font-size: 10px;
    padding: 0 4px 3px;
    opacity: 0.8;
  }
  .single-group {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 13px;
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .single-group > span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .participant-sectors {
    display: flex;
    gap: 1px;
    flex: none;
    min-width: 0;
  }
  .participant-sector,
  .more-participants {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 1px 2px;
    font-size: 11px;
    font-weight: 650;
    line-height: 1.05;
    text-align: center;
  }
  .participant-sector {
    background: var(--chip);
    color: #142016;
  }
  .group-prefix,
  .group-number,
  .group-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .group-prefix {
    font-size: 10px;
  }
  .group-number {
    font-size: 11px;
  }
  .group-number,
  .group-name {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }
  .more-participants {
    background: var(--grid);
    color: var(--ink);
    font-size: 13px;
  }
  .horizontal.long .participant-sectors,
  .horizontal.long .card-meta {
    width: min(260px, 100%);
  }
  .horizontal.long .card-heading {
    padding: 3px 5px;
  }
  .horizontal.long .card-subject {
    font-size: 12px;
  }
  .horizontal.long .participant-sector,
  .horizontal.long .more-participants {
    padding: 3px;
    font-size: 12px;
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
  .popover-participants {
    display: flex;
    gap: 3px;
    flex-wrap: wrap;
    align-items: center;
  }
  .participant-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    background: var(--chip);
    color: #142016;
    font-size: 12px;
    font-weight: 650;
    line-height: 1.2;
    padding: 1px 3px;
    border-radius: 3px;
    white-space: nowrap;
  }
  .saved-lesson-note {
    display: flex;
    align-items: baseline;
    gap: 4px;
    color: var(--muted);
    font-size: 11px;
    margin-top: 8px;
  }
  .card-meta {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    font-weight: 500;
    min-width: 0;
  }
  :global(.shared-card) .card-meta {
    padding: 1px 4px;
    font-size: 10px;
  }
  :global(.shared-card) .kind-badge {
    padding: 1px 2px;
    line-height: 1;
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
  @container (width < 120px) {
    .group-number {
      font-size: 10px;
    }
  }
  @container (height < 58px) {
    :global(.lesson-card) {
      padding: 3px;
      gap: 2px;
    }
    :global(.lesson-card.shared-card) {
      padding: 0;
      gap: 0;
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
  }
</style>
