import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from 'react';
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
  compareScheduleRefs,
  selectionKind,
  kindLabel,
  kindIcon,
} from '../../../lib/schedule-ref.ts';
import { formatDay, timeLabel } from '../../../lib/dates.ts';
import { track } from '../../../lib/analytics.ts';
import Icon from '../../../shared/ui/Icon.tsx';
import { participantClasses } from './participant-style.ts';
import { eventOwner } from '../model/event-owner.ts';
import {
  LessonRoom,
  LessonTeachers,
  LessonTeacherSources,
} from '../../resources/LessonResources.tsx';
import { useResourceInspector } from '../../resources/ResourceInspector.tsx';
import LessonDocument from '../../resources/LessonDocument.tsx';

interface LessonCardProps {
  block: LessonBlock;
  colors: GroupColors;
  subgroupCatalog?: Record<number, Subgroup[]>;
  style: CSSProperties;
  horizontal?: boolean;
  spotlightIds?: string[];
  hiddenKinds?: ScheduleKind[];
  trackMember?: Selection;
  reference?: boolean;
}

export default function LessonCard({
  block,
  colors,
  subgroupCatalog = {},
  style,
  horizontal = false,
  spotlightIds = [],
  hiddenKinds = [],
  trackMember,
  reference = false,
}: LessonCardProps) {
  const { lesson } = block;
  const { openResource } = useResourceInspector();
  const cardTrigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const resourceAction = useRef(false);
  const surfaceMembers = block.members.filter(
    (member) => !hiddenKinds.includes(selectionKind(member)),
  );
  const primaryMember =
    trackMember ?? eventOwner(surfaceMembers) ?? block.members[0];
  const resourceKind = selectionKind(primaryMember);
  const resourceSurface =
    resourceKind === 'lecturer' || resourceKind === 'auditorium';
  const shared = surfaceMembers.length > 1;
  const sharedEvent = block.members.length > 1;
  const allGroups = block.members.every(isGroup);
  const events = block.parallel ?? [lesson];
  const badges = [
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
  const labels = block.members
    .map(
      (group) =>
        `${groupLabel(group)}${savedMember(group) ? ' (сохранённые данные)' : ''}`,
    )
    .join(', ');
  const saved = block.staleMembers.length > 0;
  const allSaved = surfaceMembers.every(savedMember);
  const spotlights = surfaceMembers.filter((member) =>
    spotlightIds.includes(scheduleKey(member)),
  );
  const spotlight = spotlights.length > 0;
  const visibleMembers =
    surfaceMembers.length > 2
      ? [
          ...spotlights,
          ...surfaceMembers.filter((member) => !spotlights.includes(member)),
        ]
          .slice(0, 2)
          .sort(compareScheduleRefs)
      : surfaceMembers;
  const dimmed = spotlightIds.length > 0 && !spotlight;
  const hiddenMembers = surfaceMembers.filter(
    (member) => !visibleMembers.includes(member),
  );
  const hiddenSaved = hiddenMembers.some(savedMember);
  const long = lesson.end - lesson.start >= 240;
  const remote = events.every((event) => event.remote);
  const accessibleLabel = `${reference ? `Ссылка на общее занятие в расписании ${primaryMember.label}. ` : ''}${formatDay(lesson.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ${sharedEvent ? (allGroups ? 'Общая пара: ' : 'Одно занятие в нескольких расписаниях: ') : ''}${labels}, ${events.map((event) => `${event.subject}, ${event.kind}, ${room(event)}`).join('; ')}, ${timeLabel(lesson.start)}–${timeLabel(lesson.end)}${block.parallel ? '. Одновременные занятия одного расписания.' : ''}${spotlight ? `. Подсветка: ${spotlights.map((member) => member.label).join(', ')}.` : ''}`;
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

  const hovering = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = () => clearTimeout(timer.current);
  function enter(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    cancel();
    hovering.current = true;
    timer.current = setTimeout(() => setOpen(true), 180);
  }
  function leave(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    cancel();
    timer.current = setTimeout(() => {
      if (hovering.current) setOpen(false);
    }, 180);
  }
  useEffect(() => () => clearTimeout(timer.current), []);
  function participants(event?: Lesson) {
    return (
      <div className="popover-participants my-2 flex flex-wrap items-center gap-[3px]">
        {block.members.map((group) => (
          <span
            key={scheduleKey(group)}
            className={`participant-chip inline-flex items-center gap-[3px] rounded-[3px] px-[3px] py-px text-xs leading-[1.2] font-[650] whitespace-nowrap ${participantBackground(group)}`}
            style={chipStyle(group)}
          >
            <Icon name={kindIcon(selectionKind(group))} size={12} />
            {kindLabel(selectionKind(group))}: {groupLabel(group, event)}
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
      className={`lesson-position absolute z-[2] [container-type:size] motion-safe:animate-lesson-appear ${horizontal ? 'horizontal' : ''} ${long ? 'long' : ''}`}
      style={style}
      data-source-member={trackMember ? scheduleKey(trackMember) : undefined}
      data-shared-reference={reference ? '' : undefined}
      data-spotlight={spotlight ? '' : undefined}
      data-dimmed={dimmed ? '' : undefined}
    >
      <Popover.Root
        open={open}
        onOpenChange={(next) => {
          if (next) resourceAction.current = false;
          setOpen(next);
        }}
      >
        <Popover.Trigger
          ref={cardTrigger}
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
          className={`lesson-card relative flex size-full cursor-pointer flex-col items-stretch justify-start gap-0.5 overflow-hidden rounded-(--u-radius) p-[5px] [@container(height<36px)]:px-[3px] [@container(height<36px)]:py-0 text-left text-[11px] leading-[1.2] motion-safe:transition-[background-color,border-color,color,--lesson-stripe-base,--lesson-stripe-accent] motion-safe:duration-300 motion-safe:ease-out hover:shadow-[0_0_0_1px_var(--u-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--u-ink) ${resourceSurface && !block.parallel ? `resource-card resource-${resourceKind} bg-u-surface text-u-ink` : `${background} ${dimmed || shared || allSaved ? 'text-u-ink' : 'text-[#142016]'}`} ${border} ${remote ? 'remote-lesson border-2 border-dashed' : 'border'} ${shared ? 'shared-card' : ''} ${long ? 'long-lesson' : ''} ${block.parallel ? 'parallel-card' : ''} ${allSaved ? 'saved-card' : ''} ${reference ? 'shared-reference' : ''}`}

          onPointerEnter={enter}
          onPointerLeave={leave}
          onClick={() => {
            hovering.current = false;
            track('lesson_opened', { remote: lesson.remote });
          }}
        >
          <span className="card-heading relative z-[1] flex min-w-0 flex-none items-start gap-1">
            {resourceSurface && (
              <span className="shrink-0" title={kindLabel(resourceKind)}>
                <Icon name={kindIcon(resourceKind)} size={12} />
              </span>
            )}
            <span
              className={`card-subject min-w-0 flex-1 truncate ${trackMember ? 'text-xs' : 'text-[11px]'} font-bold ${!horizontal && !block.parallel ? '[@container(height>=74px)]:line-clamp-2 [@container(height>=74px)]:whitespace-normal' : ''}`}
            >
              {block.parallel
                ? `${events.length} занятия`
                : lesson.subject || 'Занятие'}
            </span>
          </span>
          {reference ? (
            <>
              <span className="relative z-[1] flex items-center gap-1 text-[10px] font-semibold [@container(height<38px)]:hidden">
                <Icon name="link" size={11} /> Общее занятие
                {savedMember(primaryMember) && <Icon name="clock" size={10} />}
              </span>
              <span className="relative z-[1] truncate text-[10px] [@container(height<65px)]:hidden">
                {timeLabel(lesson.start)}–{timeLabel(lesson.end)} ·{' '}
                {eventOwner(surfaceMembers)?.label}
              </span>
            </>
          ) : (
            <>
              {(long || trackMember) && (
                <span className="card-time relative z-[1] text-[10px] [@container(height<38px)]:hidden">
                  {timeLabel(lesson.start)}–{timeLabel(lesson.end)}
                </span>
              )}
              {(!trackMember || shared) && (
                <span
                  className={`participant-sectors relative z-[1] flex min-w-0 flex-none items-center gap-[3px] [@container(height<42px)]:hidden ${shared ? '' : 'font-semibold'}`}
                >
                  {(shared ? visibleMembers : [primaryMember]).map((member) => (
                    <span
                      key={scheduleKey(member)}
                      data-member-id={scheduleKey(member)}
                      data-dimmed={memberDimmed(member, true) ? '' : undefined}
                      data-spotlight={
                        spotlightIds.includes(scheduleKey(member))
                          ? ''
                          : undefined
                      }
                      className={`participant-sector inline-flex min-w-0 items-center gap-0.5 rounded-[2px] px-0.5 py-px text-[10px] leading-3 ${shared ? participantBackground(member, true) : ''}`}
                      style={chipStyle(member, true)}
                      title={groupLabel(member)}
                    >
                      {spotlightIds.includes(scheduleKey(member)) && (
                        <Icon name="tick" size={9} />
                      )}
                      <span className="truncate">{groupLabel(member)}</span>
                      {savedMember(member) && <Icon name="clock" size={10} />}
                    </span>
                  ))}
                  {hiddenMembers.length > 0 && shared && (
                    <span
                      className="more-participants inline-flex shrink-0 items-center gap-px text-[10px]"
                      title={labels}
                    >
                      +{hiddenMembers.length}
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
              )}
            </>
          )}
          <span
            className={`card-meta relative z-[1] flex min-w-0 flex-none items-center gap-[3px] text-[10px] ${reference ? '[@container(height<86px)]:hidden' : '[@container(height<52px)]:hidden'}`}
          >
            <span className="card-room min-w-0 flex-1 truncate">{place}</span>
            {trackMember && !shared && saved && <Icon name="clock" size={10} />}
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
          {shared && !horizontal && (
            <span
              className="short-participant-stripe absolute inset-x-0 bottom-0 hidden h-[3px] [@container(height<42px)]:flex"
              aria-hidden="true"
            >
              {surfaceMembers.map((member) => (
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
            </span>
          )}
        </Popover.Trigger>
        <Popover.Content
          ref={popover}
          className="lesson-popover max-h-[calc(100dvh-24px)] w-[min(340px,calc(100vw-28px))] overflow-y-auto overscroll-contain text-xs leading-[1.4] compact:w-[min(440px,calc(100vw-24px))] compact:p-4"
          positionerProps={{ sideOffset: 7 }}
          initialFocus={hovering.current ? false : undefined}
          finalFocus={() =>
            resourceAction.current ? false : (cardTrigger.current ?? true)
          }
          onPointerEnter={cancel}
          onPointerLeave={leave}
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
                    cancel();
                    hovering.current = false;
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
                      cancel();
                      hovering.current = false;
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
