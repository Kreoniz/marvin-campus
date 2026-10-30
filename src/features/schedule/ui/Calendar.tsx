import { useRef, type CSSProperties } from 'react';
import { Skeleton } from 'unlikely-ui/skeleton';
import { ScrollArea } from 'unlikely-ui/scroll-area';
import type {
  GroupSchedule,
  Subgroup,
  ScheduleKind,
} from '../../../lib/types.ts';
import { selectionKind } from '../../../lib/schedule-ref.ts';
import { addDays, formatDay, timeLabel } from '../../../lib/dates.ts';
import {
  compareDay,
  comparisonIssue,
  comparisonScope,
} from '../../../lib/domain.ts';
import { scheduleLabels } from '../../../lib/selection-labels.ts';
import type { GroupColors } from '../../../lib/colors.ts';
import { lessonBlocks } from '../../../lib/lesson-layout.ts';
import {
  dayMinimum,
  verticalLayout,
  VERTICAL_CARD_WIDTH,
  VERTICAL_LANE_PITCH,
  VERTICAL_DAY_INSET,
} from '../model/vertical-layout.ts';
import { calendarBounds } from '../model/calendar-bounds.ts';
import useCalendarNavigation from '../model/use-calendar-navigation.ts';
import LessonCard from './LessonCard.tsx';
import AutoHideScrollArea from '../../../shared/ui/AutoHideScrollArea.tsx';
import ComparisonHighlights, {
  type CalendarLayers,
} from './ComparisonHighlights.tsx';

interface CalendarProps {
  schedules: GroupSchedule[];
  colors: GroupColors;
  subgroupCatalog?: Record<number, Subgroup[]>;
  week: string;
  day: string;
  layers: CalendarLayers;
  loading: boolean;
  onDay: (day: string) => void;
  singleDay?: boolean;
  compact?: boolean;
  placeholder?: boolean;
  spotlightIds?: string[];
  hiddenKinds?: ScheduleKind[];
  vucOnly?: boolean;
}

export default function Calendar({
  schedules,
  colors,
  subgroupCatalog = {},
  week,
  day,
  layers,
  loading,
  onDay,
  singleDay = false,
  compact = false,
  placeholder = false,
  spotlightIds = [],
  hiddenKinds = [],
  vucOnly = false,
}: CalendarProps) {
  const label = scheduleLabels(schedules);
  const scroller = useRef<HTMLDivElement>(null);
  const viewportWidth = useCalendarNavigation(
    scroller,
    week,
    day,
    singleDay,
    compact,
  );
  const dates = singleDay
    ? [day]
    : Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const scale = singleDay ? 0.65 : 0.72;
  const all = schedules.flatMap((group) => group.snapshot?.data.lessons ?? []);
  const { start, end } = calendarBounds(all, vucOnly);
  const calendarHeight = Math.max(
    (end - start) * scale,
    ...all.map(
      (lesson) =>
        (lesson.start - start) * scale +
        Math.max((lesson.end - lesson.start) * scale - 3, 18),
    ),
  );
  const hours = Array.from(
    { length: (end - start) / 60 + 1 },
    (_, i) => start + i * 60,
  );
  const { included, excluded } = comparisonScope(schedules, day);
  const saved = included.some(
    (group) => group.snapshot && (group.snapshot.stale || group.error),
  );
  const hasSnapshot = schedules.some((group) => group.snapshot);
  const visible = schedules.filter(
    (group) => !hiddenKinds.includes(selectionKind(group.selection)),
  );
  const layout = dates.map((date) => {
    const blocks = lessonBlocks(schedules, date);
    const scope = comparisonScope(schedules, date);
    return {
      date,
      result: compareDay(schedules, date),
      scope,
      saved: scope.included.some(
        (group) => group.snapshot && (group.snapshot.stale || group.error),
      ),
      complete: visible.every((group) => !comparisonIssue(group, date)),
      hidden:
        (schedules.length > 0 && visible.length === 0) || blocks.length > 0,
      placed: verticalLayout(
        blocks.filter((block) =>
          block.members.some(
            (member) => !hiddenKinds.includes(selectionKind(member)),
          ),
        ),
        start,
        scale,
      ),
    };
  });
  const railWidth = compact ? 32 : 48;
  const minima = layout.map((column) =>
    dayMinimum(
      column.placed,
      compact && !singleDay ? Math.max(0, (viewportWidth - railWidth) / 2) : 0,
    ),
  );
  return (
    <>
      <AutoHideScrollArea
        className={
          compact || vucOnly
            ? 'h-[calc(var(--calendar-viewport)+var(--calendar-header)+var(--u-scroll-area-size))]'
            : 'h-[calc(var(--calendar-viewport)+var(--calendar-header)+8px)]'
        }
        style={
          {
            '--calendar-viewport': `${compact || vucOnly ? calendarHeight : 660 * scale}px`,
            '--calendar-header': singleDay ? '0px' : '44px',
          } as CSSProperties
        }
      >
        <ScrollArea.Viewport
          ref={scroller}
          onFocusCapture={(event) => {
            const card = event.target;
            if (!(card instanceof HTMLElement) || !card.matches('.lesson-card'))
              return;
            requestAnimationFrame(() => {
              const viewport = scroller.current;
              if (
                !viewport ||
                !card.isConnected ||
                document.activeElement !== card
              )
                return;
              const box = card.getBoundingClientRect();
              const bounds = viewport.getBoundingClientRect();
              const rail =
                viewport.querySelector('.time-rail')?.getBoundingClientRect()
                  .right ?? bounds.left;
              if (box.left < rail + 3)
                viewport.scrollLeft += box.left - rail - 3;
              else if (box.right > bounds.right - 3)
                viewport.scrollLeft += box.right - bounds.right + 3;
            });
          }}
          className={`week-scroll [overflow-anchor:none] [--rail-width:48px] compact:[--rail-width:32px] ${singleDay ? 'day-view [--day-base:0px]' : '[--day-base:80px] compact:[--day-base:calc((100vw-60px)/2)]'}`}
          tabIndex={0}
          role="region"
          aria-label={
            singleDay
              ? `Расписание на ${formatDay(day, { day: 'numeric', month: 'long' })}. Время слева. Каждая общая пара показана один раз с её участниками.`
              : 'Недельное расписание. На узком экране прокручивается горизонтально.'
          }
          aria-busy={loading}
        >
          <ScrollArea.Content>
            <div
              className={`week-grid grid w-full ${singleDay ? 'grid-rows-[var(--calendar-height)]' : 'grid-rows-[var(--calendar-header)_var(--calendar-height)]'}`}
              data-schedule-days
              style={
                {
                  '--calendar-height': `${calendarHeight}px`,
                  '--hour-height': `${60 * scale}px`,
                  gridTemplateColumns: `${railWidth}px ${minima.map((minimum) => `minmax(${minimum}px,1fr)`).join(' ')}`,
                  minWidth:
                    railWidth +
                    minima.reduce((sum, minimum) => sum + minimum, 0),
                } as CSSProperties
              }
            >
              {!singleDay && (
                <>
                  <div className="time-header sticky left-0 z-[5] border-b border-(--u-line-soft) bg-u-surface" />
                  {layout.map(({ date, scope }) => (
                    <button
                      type="button"
                      key={date}
                      className={`day-heading border-0 border-r border-b border-(--u-line-soft) text-sm font-bold capitalize compact:text-[13px] ${!placeholder && day === date ? 'selected bg-(--u-selection) text-(--u-selection-ink) shadow-[inset_0_0_0_1.5px_var(--u-selection-border)]' : 'bg-transparent'}`}
                      data-schedule-day={date}
                      disabled={placeholder}
                      aria-pressed={!placeholder && day === date}
                      aria-label={`${formatDay(date, {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}${scope.excluded.length ? `. Частичное сравнение: ${scope.included.length} из ${scope.included.length + scope.excluded.length}. Не учтены: ${scope.excluded.map((group) => label(group.selection)).join(', ')}` : ''}`}
                      title={
                        scope.excluded.length
                          ? `Частичное сравнение. Не учтены: ${scope.excluded.map((group) => label(group.selection)).join(', ')}`
                          : undefined
                      }
                      onClick={() => onDay(date)}
                    >
                      {placeholder ? (
                        <Skeleton className="day-label-placeholder mx-auto h-3.5 w-12 min-h-0" />
                      ) : (
                        <>
                          <span>{formatDay(date, { weekday: 'short' })}</span>{' '}
                          {Number(date.slice(8))}
                          {scope.excluded.length > 0 &&
                            !(loading && !hasSnapshot) && (
                              <span
                                className="ml-1 text-[11px] font-normal"
                                aria-label="Частичное сравнение"
                              >
                                · {scope.included.length}/
                                {scope.included.length + scope.excluded.length}
                              </span>
                            )}
                        </>
                      )}
                    </button>
                  ))}
                </>
              )}
              <div className="time-rail sticky left-0 z-[4] bg-u-surface">
                {hours.map((hour) => (
                  <span
                    key={hour}
                    className="absolute right-1.5 -translate-y-1/2 text-[10px] leading-none first:translate-y-0.5 last:-translate-y-full"
                    style={{ top: (hour - start) * scale }}
                  >
                    <span className="compact:hidden">{timeLabel(hour)}</span>
                    <span className="hidden compact:inline" aria-hidden="true">
                      {String(hour / 60).padStart(2, '0')}
                    </span>
                    <span className="sr-only hidden compact:inline">
                      {timeLabel(hour)}
                    </span>
                  </span>
                ))}
              </div>
              {layout.map((column) => {
                return (
                  <div
                    key={column.date}
                    data-calendar-date={column.date}
                    className={`day-column relative border-r border-(--u-line-soft) bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(var(--hour-height)-1px),var(--u-line-soft)_calc(var(--hour-height)-1px),var(--u-line-soft)_var(--hour-height))] ${!placeholder && !singleDay && column.date === day ? 'chosen bg-u-raised shadow-[inset_1px_0_var(--u-selection-border),inset_-1px_0_var(--u-selection-border)]' : ''}`}
                  >
                    {loading && !hasSnapshot ? (
                      <div
                        className="calendar-skeleton absolute inset-0"
                        aria-hidden="true"
                      >
                        {(placeholder ? [] : [0, 1, 2]).map((index) => (
                          <Skeleton
                            key={index}
                            className="absolute"
                            style={{
                              top: (45 + index * 180) * scale,
                              height: (index === 1 ? 150 : 95) * scale,
                              left: `${index % 2 ? 18 : 6}%`,
                              right: '6%',
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <>
                        <ComparisonHighlights
                          result={column.result}
                          layers={layers}
                          saved={column.saved}
                          start={start}
                          scale={scale}
                        />
                        {column.placed.map(
                          ({ block, top, height, column: lane }) => (
                            <LessonCard
                              key={block.identity}
                              block={block}
                              colors={colors}
                              subgroupCatalog={subgroupCatalog}
                              spotlightIds={spotlightIds}
                              hiddenKinds={hiddenKinds}
                              style={{
                                top,
                                height,
                                left:
                                  lane * VERTICAL_LANE_PITCH +
                                  VERTICAL_DAY_INSET,
                                width: VERTICAL_CARD_WIDTH,
                              }}
                            />
                          ),
                        )}
                        {!column.placed.length && (
                          <div className="empty-column absolute inset-0 flex flex-col items-center justify-center gap-3 p-2.5 text-center text-xs text-u-muted">
                            <span>
                              {!column.complete
                                ? excluded.some(
                                    (group) =>
                                      comparisonIssue(group) === 'subgroup',
                                  )
                                  ? 'Подгруппа не определена'
                                  : visible.some(
                                        (group) =>
                                          group.error && !group.snapshot,
                                      )
                                    ? 'Данные недоступны'
                                    : visible.some((group) => group.loading)
                                      ? 'Ждём данные'
                                      : 'Нет данных на этот день'
                                : column.hidden
                                  ? 'Занятия скрыты'
                                  : 'Нет занятий'}
                            </span>
                            {column.complete && column.saved && (
                              <span className="empty-saved text-[11px]">
                                По сохранённым данным
                              </span>
                            )}
                            {column.complete && !column.hidden && (
                              <img
                                src="/assets/planet.webp"
                                alt=""
                                width="52"
                                height="52"
                                className="opacity-55 in-[[data-appearance=dark]]:invert"
                              />
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        {!compact && !vucOnly && <ScrollArea.Scrollbar className="z-[6]" />}
        <ScrollArea.Scrollbar orientation="horizontal" className="z-[6]" />
        <ScrollArea.Corner />
      </AutoHideScrollArea>
      <p className="calendar-hint m-0 border-t border-(--u-line-soft) px-3.5 py-2.5 text-[11px] text-u-muted compact:p-[9px] compact:leading-normal">
        {(singleDay
          ? included.length >= 2
          : layout.some(({ scope }) => scope.included.length >= 2)) && (
          <>
            {(['presence', 'free'] as const).map(
              (layer) =>
                layers[layer] && (
                  <span
                    key={layer}
                    className={`mode-legend mr-3 inline-flex items-center gap-1 before:h-[9px] before:w-[9px] before:border-l-2 before:content-[''] ${layer === 'free' ? 'free-legend before:border-y before:border-u-accent-border before:bg-u-accent-soft' : 'before:border-campus-presence-border'} ${saved ? 'before:border-dashed' : ''}`}
                  >
                    {layer === 'presence' ? 'В вузе' : 'Без занятий'}
                  </span>
                ),
            )}
            {singleDay && (layers.presence || layers.free) && (
              <span className="mr-3">
                {excluded.length
                  ? `Частичное сравнение: ${included.map((group) => label(group.selection)).join(' + ')}. Не учтены: ${excluded.map((group) => label(group.selection)).join(', ')}`
                  : `Для всех ${included.length} участников`}
                {saved && ' · по сохранённым данным'}.
              </span>
            )}
            {!singleDay && (layers.presence || layers.free) && (
              <span className="mr-3">
                Состав сравнения указан для каждого дня.
              </span>
            )}
          </>
        )}
        <span className="lesson-hint inline">
          Нажми на занятие — подробности.
          {(!singleDay || minima[0] + railWidth > viewportWidth) && (
            <span className="mobile-hint hidden compact:inline">
              {' '}
              {singleDay
                ? 'Пары можно прокручивать →'
                : 'Дни можно прокручивать →'}
            </span>
          )}
        </span>
      </p>
    </>
  );
}
