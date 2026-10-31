import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Skeleton } from 'unlikely-ui/skeleton';
import { Select } from 'unlikely-ui/select';
import type {
  GroupSchedule,
  ScheduleKind,
  Subgroup,
} from '../../../lib/types.ts';
import {
  comparisonIssue,
  comparisonScope,
  compareDay,
} from '../../../lib/domain.ts';
import { formatDay, timeLabel } from '../../../lib/dates.ts';
import {
  scheduleKey,
  selectionKind,
  kindLabel,
} from '../../../lib/schedule-ref.ts';
import { scheduleLabels } from '../../../lib/selection-labels.ts';
import type { GroupColors } from '../../../lib/colors.ts';
import { lessonBlocks } from '../../../lib/lesson-layout.ts';
import {
  sourceLayout,
  sourceJump,
  eventAnchor,
  restoreEventAnchor,
  SOURCE_INSET,
} from '../model/source-layout.ts';
import Icon from '../../../shared/ui/Icon.tsx';
import LessonCard from './LessonCard.tsx';
import { calendarBounds } from '../model/calendar-bounds.ts';
import ComparisonHighlights, {
  type CalendarLayers,
} from './ComparisonHighlights.tsx';

interface Props {
  schedules: GroupSchedule[];
  colors: GroupColors;
  subgroupCatalog: Record<number, Subgroup[]>;
  day: string;
  layers: CalendarLayers;
  loading: boolean;
  placeholder?: boolean;
  spotlightIds: string[];
  hiddenKinds: ScheduleKind[];
  vucOnly?: boolean;
}
const scale = 1;
const rail = 44;
export default function SourceDayCalendar({
  schedules,
  colors,
  subgroupCatalog,
  day,
  layers,
  loading,
  placeholder = false,
  spotlightIds,
  hiddenKinds,
  vucOnly = false,
}: Props) {
  const label = scheduleLabels(schedules);
  const scroller = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLDivElement>(null);
  const noticeElement = useRef<HTMLParagraphElement>(null);
  const anchor = useRef<ReturnType<typeof eventAnchor>>(undefined);
  const pendingJump = useRef<string | null>(null);
  const [jumped, setJumped] = useState('');
  const requested = schedules.find(
    (schedule) => scheduleKey(schedule.selection) === jumped,
  );
  const visible = schedules.filter(
    (schedule) => !hiddenKinds.includes(selectionKind(schedule.selection)),
  );
  const blocks = lessonBlocks(schedules, day);
  const { start, end } = calendarBounds(
    blocks.map((block) => block.lesson),
    vucOnly,
  );
  const events = sourceLayout(
    blocks,
    visible.map((schedule) => schedule.selection),
    start,
    scale,
  );
  const destination = sourceJump(events, jumped);
  const notice = !requested
    ? ''
    : hiddenKinds.includes(selectionKind(requested.selection))
      ? `${label(requested.selection)}: карточки этого вида скрыты. Включи их в «Отображение» или нажми «Показать всё».`
      : !destination
        ? `${label(requested.selection)}: ${status(requested) || 'Нет занятий'}.`
        : scheduleKey(destination.member) !== jumped
          ? `${label(requested.selection)}: показано общее занятие.${status(requested) ? ` ${status(requested)}.` : ''}`
          : '';
  const width = rail + events.width;
  const height = Math.max(
    (end - start) * scale,
    ...events.occurrences.map((entry) => entry.top + entry.height),
  );
  const scope = comparisonScope(schedules, day);
  const result = compareDay(schedules, day);
  const saved = scope.included.some(
    (schedule) =>
      schedule.snapshot && (schedule.snapshot.stale || schedule.error),
  );
  const geometryKey = events.occurrences
    .map((entry) => `${entry.block.identity}:${entry.left}:${events.cardWidth}`)
    .join('|');
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const hasSnapshot = schedules.some((schedule) => schedule.snapshot);
  function syncScroll() {
    const viewport = scroller.current;
    if (!viewport) return;
    const cards = Array.from(viewport.querySelectorAll('.lesson-card'));
    const focused = cards.indexOf(document.activeElement!);
    const bounds = viewport.getBoundingClientRect();
    const card = cards[focused]?.getBoundingClientRect();
    // At the right edge a jump is clamped before its card can reach the left
    // rail. Retain that focused event, rather than an incidental left neighbor.
    anchor.current = eventAnchor(
      eventsRef.current,
      viewport.scrollLeft,
      card && card.right > bounds.left + rail && card.left < bounds.right
        ? eventsRef.current.occurrences[focused]?.block.identity
        : undefined,
    );
  }
  useLayoutEffect(() => {
    const viewport = scroller.current;
    if (!viewport) return;
    const restored = restoreEventAnchor(anchor.current, eventsRef.current);
    if (restored !== undefined) viewport.scrollLeft = restored;
    syncScroll();
  }, [geometryKey, day]);
  function status(schedule: GroupSchedule) {
    const issue = comparisonIssue(schedule, day);
    return issue === 'subgroup'
      ? 'Подгруппа не определена'
      : issue === 'coverage'
        ? 'Нет подтверждённых данных'
        : issue
          ? schedule.error
            ? 'Данные недоступны'
            : schedule.loading
              ? 'Загружаем…'
              : 'Нет данных'
          : schedule.snapshot?.stale || schedule.error
            ? 'Сохранено'
            : '';
  }
  const choices = schedules.map((schedule) => {
    const key = scheduleKey(schedule.selection);
    const target = sourceJump(events, key);
    return {
      value: key,
      label: `${label(schedule.selection)} · ${kindLabel(selectionKind(schedule.selection))}${hiddenKinds.includes(selectionKind(schedule.selection)) ? ' · скрыто' : `${status(schedule) ? ` · ${status(schedule)}` : !target ? ' · нет занятий' : ''}${target && scheduleKey(target.member) !== key ? ' · общие занятия' : ''}`}`,
    };
  });
  function jump(key: string) {
    const schedule = schedules.find(
      (schedule) => scheduleKey(schedule.selection) === key,
    );
    if (!schedule) return;
    setJumped(key);
    const destination = sourceJump(eventsRef.current, key);
    if (
      hiddenKinds.includes(selectionKind(schedule.selection)) ||
      !destination
    ) {
      // finalFocus runs before React commits the new notice text/visibility.
      requestAnimationFrame(() => noticeElement.current?.focus());
      return;
    }
    const viewport = scroller.current;
    if (!viewport) return;
    viewport.scrollLeft = destination.left - SOURCE_INSET;
    syncScroll();
    const target =
      viewport.querySelectorAll<HTMLElement>('.lesson-card')[
        eventsRef.current.occurrences.indexOf(destination)
      ];
    if (target) requestAnimationFrame(() => reveal(target));
    return target;
  }
  function reveal(target: HTMLElement) {
    const viewport = scroller.current;
    if (!viewport || !target.isConnected) return;
    const card = target.matches('.lesson-card');
    let box = target.getBoundingClientRect();
    const bounds = viewport.getBoundingClientRect();
    if (box.left < bounds.left + rail + SOURCE_INSET)
      viewport.scrollLeft += box.left - bounds.left - rail - SOURCE_INSET;
    else if (box.right > bounds.right - SOURCE_INSET)
      viewport.scrollLeft += box.right - bounds.right + SOURCE_INSET;
    syncScroll();
    box = target.getBoundingClientRect();
    const headerBottom = Math.max(
      0,
      header.current?.getBoundingClientRect().bottom ?? 0,
    );
    if (
      box.top < headerBottom + 8 ||
      (card ? box.bottom : box.top + 32) > window.innerHeight - 8
    )
      window.scrollBy({ top: box.top - headerBottom - 8, behavior: 'instant' });
  }

  const hours = Array.from(
    { length: (end - start) / 60 + 1 },
    (_, i) => start + i * 60,
  );
  return (
    <section
      className="source-day-calendar min-w-0"
      aria-label={`Расписание на ${formatDay(day, { day: 'numeric', month: 'long' })}`}
      aria-busy={loading}
    >
      <div
        ref={header}
        className="source-header sticky top-0 z-[7] overflow-hidden border-y border-u-line-soft bg-u-surface"
      >
        <div className="border-b border-u-line-soft px-2 py-1">
          <Select.Root
            value={null}
            disabled={placeholder}
            items={choices}
            onValueChange={(value) => {
              pendingJump.current = value;
            }}
          >
            <Select.Trigger
              className="source-jump min-h-11 w-full max-w-[360px] text-sm"
              aria-label={`Перейти к расписанию (${schedules.length})`}
            >
              <Select.Value placeholder="К расписанию" />
              <span className="ml-auto text-xs text-u-muted" aria-hidden="true">
                {schedules.length}
              </span>
            </Select.Trigger>
            <Select.Content
              className="source-jump-options max-h-[min(320px,var(--available-height))] w-[min(360px,calc(100vw-32px))] [&_.u-select-item]:min-h-11 [&_.u-select-item]:whitespace-normal [&_.u-select-item]:wrap-anywhere"
              finalFocus={() => {
                const key = pendingJump.current;
                pendingJump.current = null;
                return key ? (jump(key) ?? true) : true;
              }}
            >
              {choices.map((choice) => (
                <Select.Item key={choice.value} value={choice.value}>
                  {choice.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        {visible.some((schedule) => comparisonIssue(schedule, day)) &&
          !(loading && !hasSnapshot) && (
            <p className="m-0 px-3 py-1 text-xs text-u-muted" role="status">
              Нет подтверждённых данных:{' '}
              {visible
                .filter((schedule) => comparisonIssue(schedule, day))
                .map((schedule) => label(schedule.selection))
                .join(', ')}
            </p>
          )}
      </div>
      <p
        ref={noticeElement}
        hidden={!notice}
        tabIndex={-1}
        className="m-0 px-3 py-2 text-xs text-u-muted focus-visible:outline-2 focus-visible:outline-u-ink"
        role="status"
      >
        {notice}
      </p>
      <div
        ref={scroller}
        onScroll={syncScroll}
        onFocusCapture={(event) => {
          const target = event.target;
          if (
            !(target instanceof HTMLElement) ||
            !target.matches('.lesson-card')
          )
            return;
          requestAnimationFrame(() => {
            if (document.activeElement === target) reveal(target);
          });
        }}
        className="source-scroll relative overflow-x-auto overflow-y-hidden overscroll-x-contain [overflow-anchor:none]"
        role="region"
        tabIndex={0}
        aria-label="Занятия выбранных расписаний"
        style={
          {
            '--hour-height': `${60 * scale}px`,
            scrollPaddingLeft: rail + SOURCE_INSET,
          } as CSSProperties
        }
      >
        <div className="relative" style={{ width, height }}>
          <div className="time-rail sticky left-0 z-[5] h-full w-11 border-r border-u-line-soft bg-u-surface">
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-1 -translate-y-1/2 text-[10px] leading-none first:translate-y-0.5 last:-translate-y-full"
                style={{ top: (hour - start) * scale }}
              >
                {timeLabel(hour)}
              </span>
            ))}
          </div>
          <div
            data-lesson-region
            className="absolute top-0 left-11 h-full"
            style={{ width: events.width }}
          >
            <ComparisonHighlights
              result={result}
              layers={layers}
              saved={saved}
              start={start}
              scale={scale}
            />
            {loading && !hasSnapshot ? (
              <Skeleton className="mt-14 ml-[9px] h-20 w-40" />
            ) : (
              events.occurrences.map(
                ({ block, top, height: cardHeight, left, member }) => (
                  <LessonCard
                    key={block.identity}
                    block={block}
                    presentationOwner={member}
                    colors={colors}
                    subgroupCatalog={subgroupCatalog}
                    spotlightIds={spotlightIds}
                    hiddenKinds={hiddenKinds}
                    style={{
                      top,
                      height: cardHeight,
                      left,
                      width: events.cardWidth,
                    }}
                  />
                ),
              )
            )}
          </div>
          {events.occurrences.length === 0 &&
            (placeholder ? (
              <div className="absolute top-12 right-4 left-14" role="status">
                <Skeleton className="h-20 w-40" />
                <span className="sr-only">Открываем расписания…</span>
              </div>
            ) : (
              <p className="absolute top-12 right-4 left-14 text-sm text-u-muted">
                {visible.length === 0
                  ? 'Карточки выбранных видов скрыты.'
                  : visible.some((schedule) => comparisonIssue(schedule, day))
                    ? 'Нет подтверждённых данных.'
                    : 'Нет занятий'}
              </p>
            ))}
        </div>
      </div>
      {scope.included.length >= 2 && (layers.presence || layers.free) && (
        <p className="calendar-hint m-0 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-u-line-soft px-3 py-2 text-[11px] leading-4 text-u-muted">
          {layers.presence && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`calendar-layer-icon ${saved ? 'border-b border-dashed' : ''}`}
                data-layer="presence"
              >
                <Icon name="presence" size={14} />
              </span>
              В вузе
            </span>
          )}
          {layers.free && (
            <span className="inline-flex items-center gap-1.5">
              <span
                className={`calendar-layer-icon ${saved ? 'border-b border-dashed' : ''}`}
                data-layer="free"
              >
                <Icon name="free" size={14} />
              </span>
              Общие окна
            </span>
          )}
        </p>
      )}
    </section>
  );
}
