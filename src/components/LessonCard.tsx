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
import type { LessonBlock } from '../lib/lesson-layout.ts';
import { colorStyle, type GroupColors } from '../lib/colors.ts';
import { lessonKind } from '../lib/lesson-kind.ts';
import { lessonGroupLabel } from '../lib/subgroups.ts';
import { lessonKey } from '../lib/domain.ts';
import type { Lesson, Selection, Subgroup } from '../lib/types.ts';
import { timeLabel } from '../lib/dates.ts';
import { track } from '../lib/analytics.ts';
import Icon from './Icon.tsx';
import './schedule.css';

interface LessonCardProps {
  block: LessonBlock;
  colors: GroupColors;
  subgroupCatalog?: Record<number, Subgroup[]>;
  style: CSSProperties;
  horizontal?: boolean;
}

const chipStyle = (color: number): CSSProperties => {
  const categories: Record<string, number> = {
    blue: 1,
    coral: 6,
    sage: 3,
    lilac: 2,
    peach: 4,
    aqua: 5,
  };
  const value = colorStyle(color)
    .slice(7)
    .replace(
      /var\(--(blue|coral|sage|lilac|peach|aqua)\)/g,
      (_, name: string) => `var(--u-category-${categories[name]})`,
    );
  return { '--chip': value } as CSSProperties;
};

export default function LessonCard({
  block,
  colors,
  subgroupCatalog = {},
  style,
  horizontal = false,
}: LessonCardProps) {
  const { lesson } = block;
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
  const labels = block.members
    .map(
      (group) =>
        `${groupLabel(group)}${savedMember(group) ? ' (сохранённые данные)' : ''}`,
    )
    .join(', ');
  const saved = block.staleMembers.length > 0;
  const allSaved = block.staleMembers.length === block.members.length;
  const visibleMembers =
    block.members.length > 3 ? block.members.slice(0, 2) : block.members;
  const long = lesson.end - lesson.start >= 240;
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
      <div className="popover-participants">
        {block.members.map((group) => (
          <span
            key={group.id}
            className={`participant-chip${savedMember(group) ? ' saved-participant' : ''}`}
            style={chipStyle(colors[group.id] ?? 0)}
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
      className={`lesson-position${horizontal ? ' horizontal' : ''}${long ? ' long' : ''}`}
      style={style}
    >
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          render={<button type="button" />}
          style={chipStyle(colors[block.members[0].id] ?? 0)}
          className={`lesson-card${shared ? ' shared-card' : ''}${long ? ' long-lesson' : ''}${block.parallel ? ' parallel-card' : ''}${events.every((event) => event.remote) ? ' remote-lesson' : ''}${allSaved ? ' saved-card' : ''}`}
          aria-label={`${shared ? 'Общая пара: ' : ''}${labels}, ${events.map((event) => `${event.subject}, ${event.kind}, ${room(event)}`).join('; ')}, ${timeLabel(lesson.start)}–${timeLabel(lesson.end)}${block.parallel ? '. Одновременные занятия одной группы.' : ''}`}
          onPointerEnter={enter}
          onPointerLeave={leave}
          onClick={() => {
            hovering.current = false;
            track('lesson_opened', { remote: lesson.remote });
          }}
        >
          {shared && long && (
            <span className="participant-stripe" aria-hidden="true">
              {block.members.map((group) => (
                <span
                  key={group.id}
                  className={
                    savedMember(group) ? 'saved-participant' : undefined
                  }
                  style={chipStyle(colors[group.id] ?? 0)}
                />
              ))}
            </span>
          )}
          <span className="card-heading">
            <span className="card-subject">
              {block.parallel
                ? `${events.length} занятия`
                : lesson.subject || 'Занятие'}
            </span>
          </span>
          {long && !horizontal && (
            <span className="card-time">
              {timeLabel(lesson.start)}–{timeLabel(lesson.end)}
            </span>
          )}
          {shared ? (
            <span className="participant-sectors">
              {visibleMembers.map((group) => {
                const parts = groupParts(group);
                return (
                  <span
                    key={group.id}
                    className={`participant-sector${savedMember(group) ? ' saved-participant' : ''}`}
                    style={chipStyle(colors[group.id] ?? 0)}
                    title={`${groupLabel(group)}${savedMember(group) ? ' · сохранённые данные' : ''}`}
                  >
                    {horizontal && long ? (
                      <span className="group-name">
                        {groupLabel(group)}
                        {savedMember(group) && <Icon name="clock" size={10} />}
                      </span>
                    ) : (
                      <>
                        <span className="group-prefix">{parts.name}</span>
                        {parts.number && (
                          <span className="group-number">
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
              {visibleMembers.length < block.members.length && (
                <span className="more-participants" title={labels}>
                  +{block.members.length - visibleMembers.length}
                </span>
              )}
            </span>
          ) : (
            <span className="single-group">
              <span>{groupLabel(block.members[0])}</span>
              {saved && <Icon name="clock" size={12} />}
            </span>
          )}
          <span className="card-meta">
            <span className="card-room">{place}</span>
            <span className="kind-badges">
              {badges.map((kind) => (
                <Badge
                  key={kind.label}
                  className="kind-badge"
                  data-tone={kind.tone}
                  title={kind.title}
                >
                  {kind.label}
                </Badge>
              ))}
            </span>
          </span>
        </Popover.Trigger>
        <Popover.Content
          className="lesson-popover"
          positionerProps={{ sideOffset: 7 }}
          initialFocus={hovering.current ? false : undefined}
          onPointerEnter={cancel}
          onPointerLeave={leave}
        >
          <div className="popover-heading">
            <Popover.Title>
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
          <p className="lesson-time">
            {timeLabel(lesson.start)}–{timeLabel(lesson.end)}
          </p>
          {events.map((event, index) => (
            <div
              key={`${lessonKey(event)}:${index}`}
              className="lesson-description"
            >
              <h3>{event.subject}</h3>
              {block.parallel && participants(event)}
              <p>
                {event.kind || 'Тип занятия не указан'} · {room(event)}
              </p>
              {event.teacher && <p>{event.teacher}</p>}
            </div>
          ))}
          {!block.parallel && participants()}
          {saved && (
            <p className="saved-lesson-note">
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
            <p className="common-label">
              {events.length} отдельных занятий одной группы идут одновременно.
              Подробности каждого занятия указаны выше.
            </p>
          )}
          {block.common ? (
            <p className="common-label">Общая пара всех выбранных групп</p>
          ) : (
            shared && (
              <p className="common-label">
                Общая пара {block.members.length} групп.
              </p>
            )
          )}
        </Popover.Content>
      </Popover.Root>
    </div>
  );
}
