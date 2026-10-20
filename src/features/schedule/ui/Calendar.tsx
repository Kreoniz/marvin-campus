import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { Skeleton } from 'unlikely-ui/skeleton';
import type { GroupSchedule, Mode, Subgroup } from '../../../lib/types.ts';
import { addDays, formatDay, timeLabel } from '../../../lib/dates.ts';
import { compareDay } from '../../../lib/domain.ts';
import type { GroupColors } from '../../../lib/colors.ts';
import { lessonBlocks } from '../../../lib/lesson-layout.ts';
import LessonCard from './LessonCard.tsx';
import '../../../components/schedule.css';

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
  compactHeader?: boolean;
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
  compactHeader = false,
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
  const hideHeader = compactHeader && singleDay;
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
      <div
        ref={scroller}
        className={`week-scroll${singleDay ? ' day-view' : ''}${hideHeader ? ' no-day-header' : ''}`}
        tabIndex={0}
        role="region"
        style={
          {
            '--calendar-viewport': `${660 * scale}px`,
            '--calendar-header': `${hideHeader ? 0 : singleDay ? 36 : 44}px`,
          } as CSSProperties
        }
        aria-label={
          singleDay
            ? `Расписание на ${formatDay(day, { day: 'numeric', month: 'long' })}. Время слева, одновременно идущие пары рядом.`
            : 'Недельное расписание. На узком экране прокручивается горизонтально.'
        }
        aria-busy={loading}
      >
        <div
          className="week-grid"
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
          {!hideHeader && (
            <>
              <div className="time-header" />
              {dates.map((date) => (
                <button
                  type="button"
                  key={date}
                  className={`day-heading${!placeholder && day === date ? ' selected' : ''}`}
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
                    <Skeleton className="day-label-placeholder" />
                  ) : (
                    <>
                      <span>{formatDay(date, { weekday: 'short' })}</span>{' '}
                      {Number(date.slice(8))}
                    </>
                  )}
                </button>
              ))}
            </>
          )}
          <div className="time-rail">
            {hours.map((hour) => (
              <span key={hour} style={{ top: (hour - start) * scale }}>
                {timeLabel(hour)}
              </span>
            ))}
          </div>
          {layout.map((column) => {
            const highlights =
              mode === 'presence' ? column.result.presence : column.result.free;
            return (
              <div
                key={column.date}
                className={`day-column${!placeholder && column.date === day ? ' chosen' : ''}`}
              >
                {loading && !hasSnapshot ? (
                  <div className="calendar-skeleton" aria-hidden="true">
                    {(placeholder ? [] : [0, 1, 2]).map((index) => (
                      <Skeleton
                        key={index}
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
                        className={`shared-highlight${mode === 'free' ? ' free-highlight' : ''}${saved ? ' saved-highlight' : ''}`}
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
                            (block.lesson.end - block.lesson.start) * scale - 3,
                            18,
                          ),
                          left: `calc(${block.left * 100}% + 3px)`,
                          width: `calc(${block.width * 100}% - 6px)`,
                          maxWidth: 160,
                        }}
                      />
                    ))}
                    {!column.placed.length && (
                      <div className="empty-column">
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
                          <span className="empty-saved">
                            По сохранённым данным
                          </span>
                        )}
                        {complete && (
                          <img
                            src="/assets/planet.webp"
                            alt=""
                            width="52"
                            height="52"
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
      </div>
      <p className="calendar-hint">
        {schedules.length >= 2 && (
          <span
            className={`mode-legend${mode === 'free' ? ' free-legend' : ''}`}
          >
            {mode === 'presence'
              ? 'Полоса — общее время в вузе'
              : 'Полоса — все без занятий'}
            {saved && ' · по сохранённым данным'}
          </span>
        )}
        <span className="lesson-hint">
          Нажми на занятие — подробности.
          {(!singleDay || overlapWidth + 46 > viewportWidth - 40) && (
            <span className="mobile-hint">
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
