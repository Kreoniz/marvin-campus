import {
  useEffect,
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
import type { Lesson, Selection, Subgroup } from '../../../lib/types.ts';
import { formatDay, timeLabel } from '../../../lib/dates.ts';
import { track } from '../../../lib/analytics.ts';
import Icon from '../../../shared/ui/Icon.tsx';
import { participantClasses } from './participant-style.ts';
import {
  LessonRoom,
  LessonTeachers,
} from '../../resources/LessonResources.tsx';
import { useResourceInspector } from '../../resources/ResourceInspector.tsx';

interface LessonCardProps {
  block: LessonBlock;
  colors: GroupColors;
  subgroupCatalog?: Record<number, Subgroup[]>;
  style: CSSProperties;
  horizontal?: boolean;
  spotlightIds?: number[];
}

export default function LessonCard({
  block,
  colors,
  subgroupCatalog = {},
  style,
  horizontal = false,
  spotlightIds = [],
}: LessonCardProps) {
  const { lesson } = block;
  const { openResource } = useResourceInspector();
  const cardTrigger = useRef<HTMLButtonElement>(null);
  const shared = block.members.length > 1;
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
      eventMemberLessons(block, group.id, event),
      subgroupCatalog[group.id] ?? [],
    );
  }
  const savedMember = (group: Selection) =>
    block.staleMembers.includes(group.id);
  function chipStyle(group: Selection, inCard = false) {
    return {
      '--chip': lessonColor(colors[group.id] ?? 0, memberDimmed(group, inCard)),
    } as CSSProperties;
  }
  const labels = block.members
    .map(
      (group) =>
        `${groupLabel(group)}${savedMember(group) ? ' (сохранённые данные)' : ''}`,
    )
    .join(', ');
  const saved = block.staleMembers.length > 0;
  const allSaved = block.staleMembers.length === block.members.length;
  const spotlights = block.members.filter((member) =>
    spotlightIds.includes(member.id),
  );
  const spotlight = spotlights.length > 0;
  const visibleMembers =
    block.members.length > 3
      ? [
          ...spotlights,
          ...block.members.filter((member) => !spotlights.includes(member)),
        ]
          .slice(0, 2)
          .sort((a, b) => a.id - b.id)
      : block.members;
  const dimmed = spotlightIds.length > 0 && !spotlight;
  const hiddenMembers = block.members.filter(
    (member) => !visibleMembers.includes(member),
  );
  const hiddenSaved = hiddenMembers.some(savedMember);
  const long = lesson.end - lesson.start >= 240;
  const remote = events.every((event) => event.remote);
  const accessibleLabel = `${formatDay(lesson.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} ${shared ? 'Общая пара: ' : ''}${labels}, ${events.map((event) => `${event.subject}, ${event.kind}, ${room(event)}`).join('; ')}, ${timeLabel(lesson.start)}–${timeLabel(lesson.end)}${block.parallel ? '. Одновременные занятия одной группы.' : ''}${spotlight ? `. Подсветка: ${spotlights.map((member) => member.label).join(', ')}.` : ''}`;
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
    inCard && spotlightIds.length > 0 && !spotlightIds.includes(group.id);
  const participantBackground = (group: Selection, inCard = false) =>
    participantClasses(savedMember(group), memberDimmed(group, inCard));
  function groupParts(group: Selection) {
    const label = groupLabel(group),
      split = label.lastIndexOf('-');
    return split > 0
      ? { name: label.slice(0, split), number: label.slice(split + 1) }
      : { name: label, number: '' };
  }
  const [open, setOpen] = useState(false);
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
            key={group.id}
            className={`participant-chip inline-flex items-center gap-[3px] rounded-[3px] px-[3px] py-px text-xs leading-[1.2] font-[650] whitespace-nowrap ${participantBackground(group)}`}
            style={chipStyle(group)}
          >
            {groupLabel(group, event)}
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
      data-spotlight={spotlight ? '' : undefined}
      data-dimmed={dimmed ? '' : undefined}
    >
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          ref={cardTrigger}
          render={<button type="button" aria-label={accessibleLabel} />}
          style={
            {
              ...chipStyle(block.members[0], true),
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
          className={`lesson-card relative motion-safe:transition-[background-color,border-color,color,--lesson-stripe-base,--lesson-stripe-accent] motion-safe:duration-300 motion-safe:ease-out flex size-full cursor-pointer flex-col items-stretch justify-center overflow-hidden rounded-(--u-radius) text-left text-[11px] leading-[1.2] hover:shadow-[0_0_0_1px_var(--u-ink)] active:shadow-[inset_0_0_0_1px_var(--u-ink)] focus-visible:shadow-[0_0_0_1px_var(--u-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--u-focus) ${background} ${border} ${remote ? 'remote-lesson border-2 border-dashed' : 'border'} ${shared ? `shared-card gap-0 p-0 ${dimmed ? 'text-u-ink' : 'text-u-ink'}` : `gap-0.5 p-[5px] [@container(width<95px)]:px-[3px] [@container(height<58px)]:p-[3px] ${dimmed ? 'text-u-ink' : allSaved ? 'text-u-ink' : 'text-[#142016]'}`}${long ? ' long-lesson' : ''}${block.parallel ? ' parallel-card' : ''}${allSaved ? ' saved-card' : ''}`}
          onPointerEnter={enter}
          onPointerLeave={leave}
          onClick={() => {
            hovering.current = false;
            track('lesson_opened', { remote: lesson.remote });
          }}
        >
          {shared && long && (
            <span
              className="participant-stripe absolute inset-x-0 top-0 flex h-[5px]"
              aria-hidden="true"
            >
              {block.members.map((group) => (
                <span
                  key={group.id}
                  className={`flex-1 ${participantBackground(group, true)}`}
                  style={chipStyle(group, true)}
                />
              ))}
            </span>
          )}
          <span
            className={`card-heading flex min-w-0 items-center gap-[3px] [@container(width<95px)]:flex-wrap [@container(width<95px)]:gap-0.5 ${horizontal && long ? 'px-[5px] py-[3px]' : shared ? 'px-1 py-px' : ''}`}
          >
            <span
              className={`card-subject min-w-0 flex-1 truncate font-bold [@container(width<95px)]:text-[10px] [@container(height<58px)]:text-[10px] ${!horizontal && !block.parallel ? '[@container(width>=140px)_and_(height>=72px)]:line-clamp-2 [@container(width>=140px)_and_(height>=72px)]:whitespace-normal' : ''} ${horizontal && long ? 'text-xs' : 'text-[11px]'}`}
            >
              {block.parallel
                ? `${events.length} занятия`
                : lesson.subject || 'Занятие'}
            </span>
          </span>
          {long && !horizontal && (
            <span
              className={`card-time px-1 pb-[3px] text-[10px] ${dimmed ? '' : 'opacity-80'}`}
            >
              {timeLabel(lesson.start)}–{timeLabel(lesson.end)}
            </span>
          )}
          {shared ? (
            <span
              className={`participant-sectors flex min-w-0 flex-none gap-px ${horizontal && long ? 'w-[min(260px,100%)]' : ''}`}
            >
              {visibleMembers.map((group) => {
                const parts = groupParts(group);
                return (
                  <span
                    key={group.id}
                    data-member-id={group.id}
                    data-dimmed={memberDimmed(group, true) ? '' : undefined}
                    data-spotlight={
                      spotlightIds.includes(group.id) ? '' : undefined
                    }
                    className={`participant-sector flex min-w-0 flex-1 flex-col justify-center text-center leading-[1.05] font-[650] ${horizontal && long ? 'p-[3px] text-xs' : 'px-0.5 py-px text-[11px]'} ${participantBackground(group, true)}`}
                    style={chipStyle(group, true)}
                    title={`${groupLabel(group)}${savedMember(group) ? ' · сохранённые данные' : ''}`}
                  >
                    {horizontal && long ? (
                      <span className="group-name flex items-center justify-center gap-0.5 truncate">
                        {spotlightIds.includes(group.id) && (
                          <Icon name="tick" size={10} />
                        )}
                        {groupLabel(group)}
                        {savedMember(group) && <Icon name="clock" size={10} />}
                      </span>
                    ) : (
                      <>
                        <span className="group-prefix flex items-center justify-center gap-px truncate text-[10px]">
                          {spotlightIds.includes(group.id) && (
                            <Icon name="tick" size={9} />
                          )}
                          <span className="truncate">{parts.name}</span>
                        </span>
                        {parts.number && (
                          <span className="group-number flex items-center justify-center gap-0.5 truncate text-[11px] [@container(width<120px)]:text-[10px]">
                            {parts.number}
                            {savedMember(group) && (
                              <Icon name="clock" size={10} />
                            )}
                          </span>
                        )}
                        {!parts.number && savedMember(group) && (
                          <Icon name="clock" size={10} />
                        )}
                      </>
                    )}
                  </span>
                );
              })}
              {hiddenMembers.length > 0 && (
                <span
                  className={`more-participants flex min-w-0 flex-1 flex-col justify-center bg-(--u-line-soft) text-center leading-[1.05] font-[650] text-u-ink ${horizontal && long ? 'p-[3px] text-xs' : 'px-0.5 py-px text-[13px]'}`}
                  title={labels}
                >
                  <span className="inline-flex items-center justify-center gap-0.5 [&_svg]:shrink-0">
                    +{hiddenMembers.length}
                    {hiddenSaved && (
                      <>
                        <Icon name="clock" size={10} />
                        <span className="sr-only">
                          {' '}
                          — среди скрытых групп есть сохранённые данные
                        </span>
                      </>
                    )}
                  </span>
                </span>
              )}
            </span>
          ) : (
            <span className="single-group flex items-center gap-[3px] truncate text-[13px] font-[650]">
              <span className="truncate">{groupLabel(block.members[0])}</span>
              {saved && <Icon name="clock" size={12} />}
            </span>
          )}
          <span
            className={`card-meta flex min-w-0 items-center gap-[3px] font-medium [@container(width<95px)]:text-[10px] ${shared ? 'px-1 py-px text-[10px]' : 'text-[11px]'} ${horizontal && long ? 'w-[min(260px,100%)]' : ''}`}
          >
            <span className="card-room min-w-0 flex-1 truncate">{place}</span>
            <span className="kind-badges flex flex-none gap-0.5">
              {badges.map((kind) => (
                <Badge
                  key={kind.label}
                  className={`kind-badge motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out min-h-0 flex-none rounded-[3px] border text-[9px] leading-none font-semibold ${dimmed ? 'text-u-ink' : 'text-[#142016]'} [@container(height<58px)]:px-0.5 [@container(height<58px)]:py-px ${shared ? 'px-0.5 py-px' : 'px-[3px] py-0.5'} ${dimmed ? 'border-u-line bg-transparent' : 'border-[#14201640] bg-[#f7f5ebc9]'}`}
                  data-kind={kind.tone}
                  title={kind.title}
                >
                  {kind.label}
                </Badge>
              ))}
            </span>
          </span>
        </Popover.Trigger>
        <Popover.Content
          className="lesson-popover w-[min(340px,calc(100vw-28px))] text-xs leading-[1.4] compact:w-[min(440px,calc(100vw-24px))] compact:p-4"
          positionerProps={{ sideOffset: 7 }}
          initialFocus={hovering.current ? false : undefined}
          onPointerEnter={cancel}
          onPointerLeave={leave}
        >
          <div className="popover-heading mb-[5px] flex items-center justify-between gap-2.5">
            <Popover.Title className="m-0 text-sm">
              {shared ? 'Общая пара' : groupLabel(block.members[0])}
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
              <p className="my-1">
                {event.kind || 'Тип занятия не указан'} ·{' '}
                <LessonRoom
                  lesson={event}
                  onOpen={(resource, _trigger, date) => {
                    cancel();
                    hovering.current = false;
                    setOpen(false);
                    openResource(resource, cardTrigger.current, date);
                  }}
                />
              </p>
              {(event.teacher || event.teachers?.length) && (
                <p className="my-1">
                  <LessonTeachers
                    lesson={event}
                    onOpen={(resource, _trigger, date) => {
                      cancel();
                      hovering.current = false;
                      setOpen(false);
                      openResource(resource, cardTrigger.current, date);
                    }}
                  />
                </p>
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
              {events.length} отдельных занятий одной группы идут одновременно.
              Подробности каждого занятия указаны выше.
            </p>
          )}
          {block.common ? (
            <p className="common-label my-1 border-t border-(--u-line-soft) pt-2 text-[11px] text-u-muted">
              Общая пара всех выбранных групп
            </p>
          ) : (
            shared && (
              <p className="common-label my-1 border-t border-(--u-line-soft) pt-2 text-[11px] text-u-muted">
                Общая пара {block.members.length} групп.
              </p>
            )
          )}
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
