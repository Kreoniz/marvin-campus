import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { Skeleton } from 'unlikely-ui/skeleton';
import { ScrollArea } from 'unlikely-ui/scroll-area';
import type { GroupSchedule, Mode, Subgroup } from '../../../lib/types.ts';
import { addDays, formatDay, timeLabel } from '../../../lib/dates.ts';
import { compareDay } from '../../../lib/domain.ts';
import type { GroupColors } from '../../../lib/colors.ts';
import { lessonBlocks } from '../../../lib/lesson-layout.ts';
import LessonCard from './LessonCard.tsx';

interface CalendarProps {
  schedules: GroupSchedule[];
  colors: GroupColors;
  subgroupCatalog?: Record<number, Subgroup[]>;
  week: string;
  day: string;
  mode: Mode;
  loading: boolean;
  onDay: (day: string) => void;
  singleDay?: boolean;
  placeholder?: boolean;
}

export default function Calendar({
  schedules,
  colors,
  subgroupCatalog = {},
  week,
  day,
  mode,
  loading,
  onDay,
  singleDay = false,
  placeholder = false,
}: CalendarProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const [clock, setClock] = useState({ start: 480, end: 1140 });
  const dates = singleDay
    ? [day]
    : Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const scale = singleDay ? 0.65 : 0.72;
  const all = schedules.flatMap((group) => group.snapshot?.data.lessons ?? []);
  const earliest = Math.min(
    480,
    ...all.map((lesson) => Math.floor(lesson.start / 60) * 60),
  );
  const latest = Math.max(
    1140,
    ...all.map((lesson) => Math.ceil(lesson.end / 60) * 60),
  );
  useEffect(() => {
    if (loading) return;
    setClock((previous) => {
      const start = Math.min(previous.start, earliest);
      const end = Math.max(previous.end, latest);
      return start === previous.start && end === previous.end
        ? previous
        : { start, end };
    });
  }, [earliest, latest, loading]);
  useEffect(() => {
    const resize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const { start, end } = clock;
  const hours = Array.from(
    { length: (end - start) / 60 + 1 },
    (_, i) => start + i * 60,
  );
  const complete = schedules.every((group) => group.snapshot);
  const saved = schedules.some(
    (group) => group.snapshot && (group.snapshot.stale || group.error),
  );
  const hasSnapshot = schedules.some((group) => group.snapshot);
  const layout = dates.map((date) => ({
    date,
    result: compareDay(schedules, date),
    placed: lessonBlocks(schedules, date),
  }));
  const overlapWidth = Math.max(
    160,
    ...layout.flatMap((column) =>
      column.placed.map((block) => 112 * block.columns),
    ),
  );
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    if (singleDay) {
      element.scrollTo({ left: 0, behavior: 'auto' });
      return;
    }
    const column = element.querySelector<HTMLElement>('.day-column');
    if (!column) return;
    const index = Array.from({ length: 7 }, (_, i) => addDays(week, i)).indexOf(
      day,
    );
    const columnWidth = Math.max(overlapWidth, column.offsetWidth);
    element.scrollTo({
      left:
        viewportWidth <= 700
          ? Math.max(0, index) * columnWidth
          : Math.max(0, (index + 1) * columnWidth + 48 - element.clientWidth),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
    });
  }, [singleDay, week, day, viewportWidth, overlapWidth]);
  return (
    <>
      <ScrollArea.Root
        className="h-[calc(var(--calendar-viewport)+var(--calendar-header)+8px)]"
        style={
          {
            '--calendar-viewport': `${660 * scale}px`,
            '--calendar-header': '44px',
          } as CSSProperties
        }
      >
        <ScrollArea.Viewport
          ref={scroller}
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
              className="week-grid grid min-w-[calc(var(--rail-width)+var(--day-count,7)*var(--day-min))] grid-cols-[var(--rail-width)_repeat(var(--day-count,7),minmax(var(--day-min),1fr))] grid-rows-[var(--calendar-header)_var(--calendar-height)] [--day-min:max(var(--day-base),var(--overlap-min))]"
              data-schedule-days
              style={
                {
                  '--calendar-height': `${(end - start) * scale}px`,
                  '--hour-height': `${60 * scale}px`,
                  '--overlap-min': `${overlapWidth}px`,
                  '--day-count': dates.length,
                } as CSSProperties
              }
            >
              <>
                <div className="time-header sticky left-0 z-[5] border-b border-(--u-line-soft) bg-u-surface" />
                {dates.map((date) => (
                  <button
                    type="button"
                    key={date}
                    className={`day-heading border-0 border-r border-b border-(--u-line-soft) text-sm font-bold capitalize compact:text-[13px] ${!placeholder && day === date ? 'selected bg-(--u-selection) text-(--u-selection-ink) shadow-[inset_0_0_0_1.5px_var(--u-selection-border)]' : 'bg-transparent'}`}
                    data-schedule-day={date}
                    disabled={placeholder}
                    aria-pressed={!placeholder && day === date}
                    aria-label={formatDay(date, {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                    onClick={() => onDay(date)}
                  >
                    {placeholder ? (
                      <Skeleton className="day-label-placeholder mx-auto h-3.5 w-12 min-h-0" />
                    ) : (
                      <>
                        <span>{formatDay(date, { weekday: 'short' })}</span>{' '}
                        {Number(date.slice(8))}
                      </>
                    )}
                  </button>
                ))}
              </>
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
                const highlights =
                  mode === 'presence'
                    ? column.result.presence
                    : column.result.free;
                return (
                  <div
                    key={column.date}
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
                        {highlights.map((range) => (
                          <div
                            key={`${range.start}:${range.end}`}
                            className={`shared-highlight pointer-events-none absolute right-px left-px z-[1] border-l-2 transition-colors duration-150 motion-reduce:transition-none ${mode === 'free' ? 'free-highlight border-y border-u-accent-border' : 'border-campus-presence-border'} ${saved ? `saved-highlight [border-left-style:dashed] ${mode === 'free' ? 'bg-[color-mix(in_oklch,var(--u-accent-soft)_25%,transparent)]' : 'bg-[color-mix(in_oklch,var(--color-campus-presence)_10%,transparent)]'}` : mode === 'free' ? 'bg-campus-free' : 'bg-[color-mix(in_oklch,var(--color-campus-presence)_18%,transparent)]'}`}
                            aria-hidden="true"
                            style={{
                              top: (range.start - start) * scale,
                              height: (range.end - range.start) * scale,
                            }}
                          />
                        ))}
                        {column.placed.map((block) => (
                          <LessonCard
                            key={block.identity}
                            block={block}
                            colors={colors}
                            subgroupCatalog={subgroupCatalog}
                            style={{
                              top: (block.lesson.start - start) * scale,
                              height: Math.max(
                                (block.lesson.end - block.lesson.start) *
                                  scale -
                                  3,
                                18,
                              ),
                              left: `calc(${block.column} * min(${100 / block.columns}%, 166px) + 3px)`,
                              width: `calc(min(${100 / block.columns}%, 166px) - 6px)`,
                            }}
                          />
                        ))}
                        {!column.placed.length && (
                          <div className="empty-column absolute inset-0 flex flex-col items-center justify-center gap-3 p-2.5 text-center text-xs text-u-muted">
                            <span>
                              {!complete
                                ? schedules.some(
                                    (group) => group.error && !group.snapshot,
                                  )
                                  ? 'Данные недоступны'
                                  : 'Ждём данные'
                                : 'Нет занятий'}
                            </span>
                            {complete && saved && (
                              <span className="empty-saved text-[11px]">
                                По сохранённым данным
                              </span>
                            )}
                            {complete && (
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
        <ScrollArea.Scrollbar className="z-[6]" />
        <ScrollArea.Scrollbar orientation="horizontal" className="z-[6]" />
        <ScrollArea.Corner />
      </ScrollArea.Root>
      <p className="calendar-hint m-0 border-t border-(--u-line-soft) px-3.5 py-2.5 text-[11px] text-u-muted compact:p-[9px] compact:leading-normal">
        {schedules.length >= 2 && (
          <span
            className={`mode-legend mr-3 inline-flex items-center gap-[5px] before:h-[9px] before:w-[9px] before:border-l-2 before:content-[''] ${mode === 'free' ? 'free-legend before:border-u-accent-border before:bg-(--u-accent-soft)' : 'before:border-campus-presence-border before:bg-campus-presence'} ${saved ? 'before:border-dashed' : ''}`}
          >
            {mode === 'presence'
              ? 'Полоса — общее время в вузе'
              : 'Полоса — все без занятий'}
            {saved && ' · по сохранённым данным'}
          </span>
        )}
        <span className="lesson-hint inline">
          Нажми на занятие — подробности.
          {(!singleDay || overlapWidth + 46 > viewportWidth - 40) && (
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
