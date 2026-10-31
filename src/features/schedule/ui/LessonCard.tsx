import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Popover } from 'unlikely-ui/popover';
import { Badge } from 'unlikely-ui/badge';
import { Button } from 'unlikely-ui/button';
import {
  eventMemberLessons,
  type LessonBlock,
} from '../../../lib/lesson-layout.ts';
import { lessonColor, type GroupColors } from '../../../lib/colors.ts';
import { lessonKind } from '../../../lib/lesson-kind.ts';
import { lessonGroupLabel } from '../../../lib/subgroups.ts';
import { lessonKey } from '../../../lib/domain.ts';
import type {
  Lesson,
  Selection,
  Subgroup,
  ScheduleKind,
} from '../../../lib/types.ts';
import {
  isGroup,
  scheduleKey,
  selectionKind,
  kindLabel,
  kindIcon,
} from '../../../lib/schedule-ref.ts';
import { formatDay, timeLabel } from '../../../lib/dates.ts';
import { track } from '../../../lib/analytics.ts';
import Icon from '../../../shared/ui/Icon.tsx';
import { participantClasses } from './participant-style.ts';
import { compactAudience } from '../model/lesson-audience.ts';
import {
  LessonRoom,
  LessonTeachers,
  LessonTeacherSources,
} from '../../resources/LessonResources.tsx';
import { useResourceInspector } from '../../resources/ResourceInspector.tsx';
import LessonDocument from '../../resources/LessonDocument.tsx';
import { scheduleLabels } from '../../../lib/selection-labels.ts';
import MilitaryPreview from '../../resources/MilitaryPreview.tsx';
import MilitaryInline from '../../resources/MilitaryInline.tsx';

interface LessonCardProps {
  block: LessonBlock;
  colors: GroupColors;
  subgroupCatalog?: Record<number, Subgroup[]>;
  style: CSSProperties;
  horizontal?: boolean;
  spotlightIds?: string[];
  hiddenKinds?: ScheduleKind[];
  presentationOwner?: Selection;
  compact?: boolean;
}

const compactPopupQuery =
  '(max-width: 700px), (max-width: 1000px) and (max-height: 500px)';

export default function LessonCard({
  block,
  colors,
  subgroupCatalog = {},
  style,
  horizontal = false,
  spotlightIds = [],
  hiddenKinds = [],
  presentationOwner,
  compact = false,
}: LessonCardProps) {
  const { lesson } = block;
  const { openResource, schedules } = useResourceInspector();
  const sourceLabel = scheduleLabels(schedules);
  const order = new Map(
    schedules.map((row, index) => [scheduleKey(row.selection), index]),
  );
  const members = block.members
    .slice()
    .sort(
      (a, b) =>
        (order.get(scheduleKey(a)) ?? Infinity) -
        (order.get(scheduleKey(b)) ?? Infinity),
    );
  const cardTrigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const resourceAction = useRef(false);
  const focusLeft = useRef(false);
  const surfaceMembers = members.filter(
    (member) => !hiddenKinds.includes(selectionKind(member)),
  );
  const primaryMember =
    presentationOwner ?? surfaceMembers[0] ?? block.members[0];
  const resourceKind = selectionKind(primaryMember);
  const resourceSurface =
    resourceKind === 'lecturer' || resourceKind === 'auditorium';
  const shared = surfaceMembers.length > 1;
  const sharedEvent = members.length > 1;
  const allGroups = members.every(isGroup);
  const events = block.parallel ?? [lesson];
  const audience = compactAudience(events);
  const badges = [
    ...new Map(
      events.flatMap((event) => {
        const kind = lessonKind(event.kind);
        return kind ? [[kind.label, kind] as const] : [];
      }),
    ).values(),
  ];
  const room = (event: Lesson) =>
    event.remote ? 'Онлайн' : event.room.trim() || 'Аудитория не указана';
  const place = [...new Set(events.map(room))].join(' / ');
  function groupLabel(group: Selection, event?: Lesson) {
    return lessonGroupLabel(
      group,
      eventMemberLessons(block, scheduleKey(group), event),
      isGroup(group) ? (subgroupCatalog[group.id] ?? []) : [],
    );
  }
  const savedMember = (group: Selection) =>
    block.staleMembers.includes(scheduleKey(group));
  function chipStyle(group: Selection, inCard = false) {
    return {
      '--chip': lessonColor(
        colors[scheduleKey(group)] ?? 0,
        memberDimmed(group, inCard),
      ),
    } as CSSProperties;
  }
  const labels = members
    .map(
      (group) =>
        `${group.kind === 'vuc' ? sourceLabel(group) : groupLabel(group)}${savedMember(group) ? ' (сохранённые данные)' : ''}`,
    )
    .join(', ');
  const saved = block.staleMembers.length > 0;
  const allSaved = surfaceMembers.every(savedMember);
  const spotlights = surfaceMembers.filter((member) =>
    spotlightIds.includes(scheduleKey(member)),
  );
  const spotlight = spotlights.length > 0;
  const long = lesson.end - lesson.start >= 240;
  const [memberCapacity, setMemberCapacity] = useState(1);
  const [memberColumns, setMemberColumns] = useState(1);
  const [inlineEntries, setInlineEntries] = useState(0);
  const memberMetrics = surfaceMembers.map((member) => ({
    label: groupLabel(member),
    saved: savedMember(member),
    group: isGroup(member),
  }));
  const metricsKey = JSON.stringify(memberMetrics);
  useLayoutEffect(() => {
    const trigger = cardTrigger.current;
    if (!trigger) return;
    const metrics: typeof memberMetrics = JSON.parse(metricsKey);
    // Measure only this surface. Duration is not a proxy for the 62px
    // horizontal row, and labels must leave room for the remainder/markers.
    const context = document.createElement('canvas').getContext('2d');
    const measure = () => {
      if (!trigger.isConnected) return;
      const width = trigger.clientWidth - 10;
      const height = trigger.clientHeight;
      if (context)
        context.font = `600 11px ${getComputedStyle(trigger).fontFamily}`;
      // Names own full-width sectors. Short group codes may wrap at the
      // hyphen; long resource names get wider sectors, with all members in details.
      const minimum = Math.max(
        44,
        ...metrics
          .slice(0, 3)
          .map((member) =>
            member.group
              ? Math.min(
                  64,
                  Math.ceil(
                    Math.max(
                      ...member.label
                        .split(/[-\s]/u)
                        .map(
                          (part) =>
                            context?.measureText(part).width ?? part.length * 7,
                        ),
                    ),
                  ) +
                    6 +
                    (member.saved ? 10 : 0),
                )
              : 72,
          ),
      );
      const columns = Math.max(
        1,
        Math.min(3, metrics.length, Math.floor(width / minimum)),
      );
      const rows = !horizontal && height >= 440 ? 2 : 1;
      const slots = columns * rows;
      setMemberColumns(columns);
      setMemberCapacity(
        Math.max(
          1,
          Math.min(metrics.length, slots - (metrics.length > slots ? 1 : 0)),
        ),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(trigger);
    void document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [horizontal, metricsKey]);
  const visibleMembers = surfaceMembers.slice(0, memberCapacity);
  const dimmed = spotlightIds.length > 0 && !spotlight;
  const hiddenMembers = surfaceMembers.filter(
    (member) => !visibleMembers.includes(member),
  );
  const hiddenSaved = hiddenMembers.some(savedMember);
  const military =
    members.some(isGroup) && /военная\s+подготовка/iu.test(lesson.subject);
  const remote = events.every((event) => event.remote);
  const accessibleLabel = `${formatDay(lesson.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ${sharedEvent ? (allGroups ? 'Общая пара: ' : 'Одно занятие в нескольких расписаниях: ') : ''}${labels}, ${events.map((event) => `${event.subject}, ${event.kind || 'Тип занятия не указан'}, ${room(event)}`).join('; ')}, ${timeLabel(lesson.start)}–${timeLabel(lesson.end)}${block.parallel ? '. Одновременные занятия одного расписания.' : ''}${spotlight ? `. Подсветка: ${spotlights.map((member) => member.label).join(', ')}.` : ''}`;
  const background = dimmed
    ? block.parallel
      ? 'bg-[repeating-linear-gradient(135deg,var(--lesson-stripe-base)_0_9px,var(--lesson-stripe-accent)_9px_18px)]'
      : shared
        ? 'bg-u-surface'
        : allSaved
          ? 'bg-[color-mix(in_srgb,var(--chip)_90%,var(--u-well))]'
          : 'bg-(--chip)'
    : block.parallel
      ? 'bg-[repeating-linear-gradient(135deg,var(--lesson-stripe-base)_0_9px,var(--lesson-stripe-accent)_9px_18px)]'
      : shared
        ? 'bg-u-surface'
        : allSaved
          ? 'bg-[color-mix(in_srgb,var(--chip)_25%,var(--u-well))]'
          : 'bg-(--chip)';
  const border = dimmed
    ? 'border-u-line'
    : remote
      ? allSaved
        ? 'border-[color-mix(in_srgb,var(--u-muted)_70%,var(--u-well))]'
        : shared
          ? 'border-u-line'
          : 'border-[#405637]'
      : allSaved
        ? shared
          ? 'border-[color-mix(in_srgb,var(--u-line)_55%,var(--u-line-soft))]'
          : 'border-(--u-line-soft)'
        : shared
          ? 'border-u-line'
          : 'border-[color-mix(in_srgb,var(--chip)_65%,#384333)]';
  const memberDimmed = (group: Selection, inCard: boolean) =>
    inCard &&
    spotlightIds.length > 0 &&
    !spotlightIds.includes(scheduleKey(group));
  const participantBackground = (group: Selection, inCard = false) =>
    participantClasses(savedMember(group), memberDimmed(group, inCard));
  const [open, setOpen] = useState(false);
  const [compactPopup, setCompactPopup] = useState(false);
  const [hoverSide, setHoverSide] = useState<'left' | 'right'>();
  useLayoutEffect(() => {
    if (!open) return;
    const size = matchMedia(compactPopupQuery);
    const resize = () => setCompactPopup(size.matches);
    resize();
    size.addEventListener('change', resize);
    return () => size.removeEventListener('change', resize);
  }, [open]);
  // A bundle may split when another source joins one of its events. Keep the
  // user's logical event focused, unless they have moved to another control.
  useLayoutEffect(() => {
    const trigger = cardTrigger.current;
    const content = popover.current;
    return () => {
      if (
        !trigger ||
        resourceAction.current ||
        (document.activeElement !== trigger &&
          !content?.contains(document.activeElement))
      )
        return;
      const region = trigger.closest<HTMLElement>(
        '[data-lesson-region], [role="region"]',
      );
      const keys: string[] = JSON.parse(trigger.dataset.lessonKeys ?? '[]');
      requestAnimationFrame(() => {
        if (
          trigger.isConnected ||
          (document.activeElement !== document.body &&
            document.activeElement?.isConnected)
        )
          return;
        const cards = Array.from(
          region?.querySelectorAll<HTMLButtonElement>('[data-lesson-keys]') ??
            [],
        );
        const matches = (card: HTMLButtonElement, key: string) =>
          (JSON.parse(card.dataset.lessonKeys ?? '[]') as string[]).includes(
            key,
          );
        const next = cards.find((card) =>
          keys.some((key) => matches(card, key)),
        );
        (
          next ??
          region ??
          document.querySelector<HTMLButtonElement>('.add-group')
        )?.focus({ preventScroll: true });
      });
    };
  }, [open]);

  const [hovering, setHovering] = useState(false);
  const pinned = useRef(false);
  function participants(event?: Lesson) {
    return (
      <div className="popover-participants my-2 flex flex-wrap items-center gap-[3px]">
        {members.map((group) => (
          <span
            key={scheduleKey(group)}
            className={`participant-chip inline-flex items-center gap-[3px] rounded-[3px] px-[3px] py-px text-xs leading-[1.2] font-[650] whitespace-nowrap ${participantBackground(group)}`}
            style={chipStyle(group)}
          >
            <Icon name={kindIcon(selectionKind(group))} size={12} />
            {kindLabel(selectionKind(group))}:{' '}
            {group.kind === 'vuc'
              ? sourceLabel(group)
              : groupLabel(group, event)}
            {savedMember(group) && (
              <>
                <Icon name="clock" size={12} />
                <span className="sr-only"> — сохранённые данные</span>
              </>
            )}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div
      className={`lesson-position absolute z-[2] [container-type:size] ${members.every((member) => member.kind === 'vuc') ? '' : 'motion-safe:animate-lesson-appear'} ${horizontal ? 'horizontal' : ''} ${long ? 'long' : ''}`}
      style={style}
      data-source-member={
        presentationOwner ? scheduleKey(presentationOwner) : undefined
      }
      data-popup-open={open ? '' : undefined}
      data-spotlight={spotlight ? '' : undefined}
      data-dimmed={dimmed ? '' : undefined}
    >
      <Popover.Root
        open={open}
        onOpenChange={(next, details) => {
          if (next && !open) setHoverSide(undefined);
          if (details.reason === 'focus-out') focusLeft.current = true;
          if (details.reason === 'trigger-press') {
            // The first click on a hover preview pins it; the second closes it.
            if (!next && !pinned.current) {
              pinned.current = true;
              setHovering(false);
              // Keep controlled open, but accept the press interaction so Base
              // UI enables its focus manager after a patient hover click.
              return;
            }
            pinned.current = next;
            setHovering(false);
          } else if (details.reason === 'trigger-hover') {
            if (!next && pinned.current) {
              details.cancel();
              return;
            }
            if (next) {
              if (
                matchMedia(compactPopupQuery).matches &&
                matchMedia('(hover: hover) and (pointer: fine)').matches
              ) {
                const anchor = cardTrigger.current?.getBoundingClientRect();
                const width = Math.min(440, innerWidth - 24);
                const side =
                  anchor && innerWidth - anchor.right - 23 >= width
                    ? 'right'
                    : anchor && anchor.left - 23 >= width
                      ? 'left'
                      : undefined;
                // A hover preview must leave its press target exposed. When
                // neither side fits, an explicit press uses the bounded popup.
                if (!side) {
                  details.cancel();
                  return;
                }
                setHoverSide(side);
              }
              setHovering(true);
              pinned.current = false;
            }
          }
          if (next) {
            resourceAction.current = false;
            focusLeft.current = false;
          } else {
            setHovering(false);
            pinned.current = false;
          }
          setOpen(next);
        }}
      >
        <Popover.Trigger
          ref={cardTrigger}
          openOnHover
          delay={100}
          closeDelay={120}
          data-lesson-keys={JSON.stringify(
            events.filter((event) => event.id).map(lessonKey),
          )}
          render={<button type="button" aria-label={accessibleLabel} />}
          style={
            {
              ...chipStyle(primaryMember, true),
              ...(block.parallel
                ? {
                    '--lesson-stripe-base':
                      dimmed || !allSaved
                        ? 'var(--chip)'
                        : 'color-mix(in srgb,var(--chip) 25%,var(--u-well))',
                    '--lesson-stripe-accent': dimmed
                      ? 'color-mix(in srgb,var(--chip) 80%,var(--u-well))'
                      : allSaved
                        ? 'var(--u-well)'
                        : 'color-mix(in srgb,var(--chip) 78%,white)',
                  }
                : {}),
            } as CSSProperties
          }
          data-resource-kind={resourceKind}
          className={`lesson-card relative flex size-full cursor-pointer flex-col items-stretch justify-start gap-0.5 overflow-hidden rounded-(--u-radius) ${compact ? 'p-1' : 'p-[5px]'} [@container(height<36px)]:px-[3px] [@container(height<36px)]:py-0 text-left text-[11px] leading-[1.2] motion-safe:transition-[background-color,border-color,color,--lesson-stripe-base,--lesson-stripe-accent] motion-safe:duration-300 motion-safe:ease-out hover:shadow-[0_0_0_1px_var(--u-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--u-ink) ${resourceSurface && !block.parallel ? `resource-card resource-${resourceKind} bg-u-surface text-u-ink` : `${background} ${dimmed || shared || allSaved ? 'text-u-ink' : 'text-[#142016]'}`} ${border} ${remote ? 'remote-lesson border-2 border-dashed' : 'border'} ${shared ? 'shared-card' : ''} ${long ? 'long-lesson' : ''} ${block.parallel ? 'parallel-card' : ''} ${allSaved ? 'saved-card' : ''}`}
          onClick={() => {
            setHovering(false);
            track('lesson_opened', { remote: lesson.remote });
          }}
          onKeyDown={(event) => {
            if (event.key === 'Tab' && !event.shiftKey && open && hovering) {
              // A hover preview has no focus manager until it is activated.
              event.preventDefault();
              event.currentTarget.click();
            }
          }}
        >
          <span className="card-heading relative z-[1] flex min-w-0 flex-none items-start gap-1">
            {resourceSurface && (
              <span className="shrink-0" title={kindLabel(resourceKind)}>
                <Icon name={kindIcon(resourceKind)} size={12} />
              </span>
            )}
            <span
              className={`card-subject min-w-0 flex-1 truncate ${presentationOwner && !compact ? 'text-xs' : 'text-[11px]'} font-bold ${!horizontal && !block.parallel ? '[@container(height>=74px)]:line-clamp-2 [@container(height>=74px)]:whitespace-normal' : ''}`}
            >
              {block.parallel
                ? `${events.length} занятия`
                : lesson.subject || 'Занятие'}
            </span>
          </span>
          {!horizontal && (long || (presentationOwner && !compact)) && (
            <span className="card-time relative z-[1] text-[10px] [@container(height<38px)]:hidden">
              {timeLabel(lesson.start)}–{timeLabel(lesson.end)}
            </span>
          )}
          {!shared && resourceKind === 'auditorium' && audience && (
            <span
              className="card-audience relative z-[1] truncate text-[10px] font-semibold [@container(height<52px)]:hidden"
              title={events
                .map((event) => event.audiences?.join('; ') || event.audience)
                .filter(Boolean)
                .join('; ')}
            >
              {audience}
            </span>
          )}
          {shared || resourceKind !== 'auditorium' ? (
            <span
              className={`participant-sectors relative z-[1] min-w-0 flex-none [@container(height<42px)]:hidden ${shared ? 'shared-sectors grid' : 'flex items-center font-semibold'}`}
              style={
                shared
                  ? {
                      gridTemplateColumns:
                        memberColumns === 1 && hiddenMembers.length > 0
                          ? 'minmax(0, 1fr) max-content'
                          : `repeat(${memberColumns}, minmax(0, 1fr))`,
                    }
                  : undefined
              }
            >
              {(shared ? visibleMembers : [primaryMember]).map((member) => {
                const label = groupLabel(member);
                const code =
                  shared && isGroup(member) && !horizontal
                    ? /^([^-]+)-(\d.*)$/u.exec(label)
                    : null;
                return (
                  <span
                    key={scheduleKey(member)}
                    data-member-id={scheduleKey(member)}
                    data-dimmed={memberDimmed(member, true) ? '' : undefined}
                    data-spotlight={
                      spotlightIds.includes(scheduleKey(member))
                        ? ''
                        : undefined
                    }
                    className={`participant-sector inline-flex min-w-0 max-w-full items-center justify-center gap-0.5 px-0.5 py-px leading-3 ${shared ? `text-[11px] font-semibold ${participantBackground(member, true)}` : 'text-[10px]'}`}
                    style={chipStyle(member, true)}
                    title={groupLabel(member)}
                  >
                    <span
                      className={
                        shared && !horizontal
                          ? 'line-clamp-2 text-center wrap-anywhere'
                          : 'truncate'
                      }
                    >
                      {code ? (
                        <>
                          {code[1]}
                          <span className="member-code-tail">
                            <span className="member-code-dash">-</span>
                            {code[2]}
                          </span>
                        </>
                      ) : (
                        label
                      )}
                    </span>
                    {savedMember(member) && <Icon name="clock" size={10} />}
                  </span>
                );
              })}
              {hiddenMembers.length > 0 && shared && (
                <span
                  className="more-participants inline-flex min-w-0 items-center justify-center gap-0.5 bg-u-well px-0.5 py-px text-[11px] font-semibold"
                  title={labels}
                  data-spotlight={
                    hiddenMembers.some((member) =>
                      spotlightIds.includes(scheduleKey(member)),
                    )
                      ? ''
                      : undefined
                  }
                >
                  +{hiddenMembers.length}
                  {hiddenMembers.some((member) =>
                    spotlightIds.includes(scheduleKey(member)),
                  ) && (
                    <span className="sr-only">
                      {' '}
                      — есть выделенные расписания
                    </span>
                  )}
                  {hiddenSaved && (
                    <>
                      <Icon name="clock" size={10} />
                      <span className="sr-only">
                        {' '}
                        — есть сохранённые данные
                      </span>
                    </>
                  )}
                </span>
              )}
            </span>
          ) : null}
          <span
            className={`card-meta relative z-[1] flex min-w-0 flex-none items-center gap-[3px] text-[10px] [@container(height<52px)]:hidden`}
          >
            <span className="card-room min-w-0 flex-1 truncate">
              {shared && resourceKind === 'auditorium' ? audience : place}
            </span>
            {presentationOwner && !shared && saved && (
              <Icon name="clock" size={10} />
            )}
            <span className="kind-badges flex shrink-0 gap-0.5">
              {badges.map((kind) => (
                <Badge
                  key={kind.label}
                  className={`kind-badge min-h-0 rounded-[3px] border px-0.5 py-px text-[9px] leading-none font-semibold ${dimmed || resourceSurface || allSaved || shared ? 'border-u-line bg-u-surface text-u-ink' : 'border-[#14201640] bg-[#f7f5ebc9] text-[#142016]'}`}
                  data-kind={kind.tone}
                  title={kind.title}
                >
                  {kind.label}
                </Badge>
              ))}
            </span>
          </span>
          {military && !horizontal && (
            <MilitaryInline
              date={lesson.date}
              onVisibleEntriesChange={setInlineEntries}
            />
          )}
          {shared && !horizontal && (
            <span
              className="short-participant-stripe absolute inset-x-0 bottom-0 hidden h-[3px] [@container(height<42px)]:flex"
              aria-hidden="true"
            >
              {surfaceMembers.slice(0, 3).map((member) => (
                <span
                  key={scheduleKey(member)}
                  data-short-member={scheduleKey(member)}
                  data-dimmed={memberDimmed(member, true) ? '' : undefined}
                  data-spotlight={
                    spotlightIds.includes(scheduleKey(member)) ? '' : undefined
                  }
                  className={`flex-1 ${participantBackground(member, true)}`}
                  style={chipStyle(member, true)}
                />
              ))}
              {surfaceMembers.length > 3 && (
                <span className="flex-1 bg-u-muted" />
              )}
            </span>
          )}
        </Popover.Trigger>
        <Popover.Content
          ref={popover}
          className="lesson-popover motion-safe:duration-100 max-h-[min(calc(100dvh-24px),var(--available-height))] w-[min(340px,calc(100vw-28px))] overflow-y-auto overscroll-contain text-xs leading-[1.4] compact:w-[min(440px,calc(100vw-24px))] compact:p-4"
          positionerProps={{
            sideOffset: 7,
            side: hoverSide,
            // Press-opened compact popups may overlap tall anchors; mouse
            // previews stay beside the card, including after the pinning click.
            collisionAvoidance: hoverSide
              ? { side: 'flip', align: 'shift', fallbackAxisSide: 'none' }
              : compactPopup
                ? { side: 'shift', align: 'shift' }
                : undefined,
          }}
          initialFocus={hovering ? false : undefined}
          onPointerDownCapture={() => {
            pinned.current = true;
            setHovering(false);
          }}
          finalFocus={() =>
            resourceAction.current || focusLeft.current
              ? false
              : (cardTrigger.current ?? true)
          }
        >
          <div className="popover-heading mb-[5px] flex items-center justify-between gap-2.5">
            <Popover.Title className="m-0 text-sm">
              {sharedEvent
                ? allGroups
                  ? 'Общая пара'
                  : 'Общее занятие'
                : groupLabel(primaryMember)}
            </Popover.Title>
            <Popover.Close
              render={
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Закрыть подробности"
                />
              }
            >
              <Icon name="close" size={16} />
            </Popover.Close>
          </div>
          <p className="lesson-time my-1 text-base font-bold">
            {timeLabel(lesson.start)}–{timeLabel(lesson.end)}
          </p>
          {events.map((event, index) => (
            <div
              key={`${lessonKey(event)}:${index}`}
              className={`lesson-description ${index > 0 ? 'mt-2 border-t border-(--u-line-soft) pt-2' : ''}`}
            >
              <h3 className="mt-0 mb-[5px] text-[15px] font-[750]">
                {event.subject}
              </h3>
              {block.parallel && participants(event)}
              {(event.audiences?.length || event.audience) && (
                <p className="my-1 text-xs text-u-muted">
                  {event.audiences?.join('; ') || event.audience}
                </p>
              )}
              {event.metadataWarnings?.map((warning) => (
                <p className="my-1 text-xs text-u-muted" key={warning}>
                  {warning}
                </p>
              ))}
              <p className="my-1">
                {event.kind || 'Тип занятия не указан'} ·{' '}
                <LessonRoom
                  lesson={event}
                  onOpen={(resource, _trigger, date) => {
                    resourceAction.current = true;
                    setHovering(false);
                    setOpen(false);
                    openResource(resource, cardTrigger.current, date, {
                      eventKey: lessonKey(event),
                      region:
                        cardTrigger.current?.closest<HTMLElement>(
                          '[data-lesson-region], [role="region"]',
                        ) ?? null,
                      popup: popover.current,
                    });
                  }}
                />
              </p>
              {(event.teacher || event.teachers?.length) && (
                <p className="my-1">
                  <LessonTeachers
                    lesson={event}
                    onOpen={(resource, _trigger, date) => {
                      resourceAction.current = true;
                      setHovering(false);
                      setOpen(false);
                      openResource(resource, cardTrigger.current, date, {
                        eventKey: lessonKey(event),
                        region:
                          cardTrigger.current?.closest<HTMLElement>(
                            '[data-lesson-region], [role="region"]',
                          ) ?? null,
                        popup: popover.current,
                      });
                    }}
                  />
                </p>
              )}
              <LessonTeacherSources
                entry={{
                  ...block,
                  lesson: event,
                  memberLessons: Object.fromEntries(
                    block.members.map((member) => [
                      scheduleKey(member),
                      eventMemberLessons(block, scheduleKey(member), event),
                    ]),
                  ),
                }}
              />
              <LessonDocument lesson={event} />
              {members.some(isGroup) &&
                /военная\s+подготовка/iu.test(event.subject) && (
                  <MilitaryPreview
                    date={event.date}
                    collapseEntries={!horizontal && inlineEntries > 0}
                  />
                )}
            </div>
          ))}
          {!block.parallel && participants()}
          {saved && (
            <p className="saved-lesson-note mt-2 mb-1 flex items-baseline gap-1 text-[11px] text-u-muted">
              <Icon name="clock" size={13} />
              По сохранённым данным:{' '}
              {block.members
                .filter(savedMember)
                .map((group) => group.label)
                .join(', ')}
              .
            </p>
          )}
          {block.parallel && (
            <p className="common-label my-1 border-t border-(--u-line-soft) pt-2 text-[11px] text-u-muted">
              {events.length} отдельных занятий одного расписания идут
              одновременно. Подробности каждого занятия указаны выше.
            </p>
          )}
          {block.common ? (
            <p className="common-label my-1 border-t border-(--u-line-soft) pt-2 text-[11px] text-u-muted">
              {allGroups
                ? 'Общая пара всех выбранных групп'
                : 'Одно занятие в выбранных расписаниях'}
            </p>
          ) : (
            sharedEvent && (
              <p className="common-label my-1 border-t border-(--u-line-soft) pt-2 text-[11px] text-u-muted">
                {allGroups
                  ? `Общая пара ${block.members.length} групп.`
                  : `Одно занятие в ${block.members.length} выбранных расписаниях.`}
              </p>
            )
          )}
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
