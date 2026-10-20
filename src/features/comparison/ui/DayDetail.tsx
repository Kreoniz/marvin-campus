import type { CSSProperties } from 'react';
import { Card } from 'unlikely-ui/card';
import { Skeleton } from 'unlikely-ui/skeleton';
import type { GroupSchedule, Mode, Subgroup } from '../../../lib/types.ts';
import { formatDay, timeLabel } from '../../../lib/dates.ts';
import { compareDay } from '../../../lib/domain.ts';
import { lessonBlocks } from '../../../lib/lesson-layout.ts';
import type { GroupColors } from '../../../lib/colors.ts';
import LessonCard from '../../schedule/ui/LessonCard.tsx';
import ComparisonSummary from './ComparisonSummary.tsx';

interface DayDetailProps {
  schedules: GroupSchedule[];
  colors: GroupColors;
  subgroupCatalog?: Record<number, Subgroup[]>;
  subgroupShades?: boolean;
  day: string;
  mode: Mode;
  loading: boolean;
  placeholder?: boolean;
}

export default function DayDetail({
  schedules,
  colors,
  subgroupCatalog = {},
  subgroupShades = false,
  day,
  mode,
  loading,
  placeholder = false,
}: DayDetailProps) {
  const result = compareDay(schedules, day);
  const saved = schedules.some(
    (group) => group.snapshot && (group.snapshot.stale || group.error),
  );
  const placed = lessonBlocks(schedules, day);
  const all = schedules.flatMap((group) => group.snapshot?.data.lessons ?? []);
  const start = Math.min(
    480,
    ...all.map((lesson) => Math.floor(lesson.start / 60) * 60),
  );
  const end = Math.max(
    1140,
    ...all.map((lesson) => Math.ceil(lesson.end / 60) * 60),
  );
  const hours = Array.from(
    { length: (end - start) / 60 + 1 },
    (_, i) => start + i * 60,
  );
  const rows = Math.max(1, ...placed.map((block) => block.columns));
  const weekRows = Math.max(
    1,
    ...[...new Set(all.map((lesson) => lesson.date))].flatMap((date) =>
      lessonBlocks(schedules, date).map((block) => block.columns),
    ),
  );
  const rowHeight = 68;
  const panelHeight = Math.max(252, Math.min(496, weekRows * rowHeight + 104));
  const highlights = mode === 'presence' ? result.presence : result.free;
  return (
    <Card.Root
      className="day-detail mt-[17px] flex h-[var(--detail-height)] gap-3.5 p-3 [overflow-anchor:none] [&>.marvin-card]:min-h-0 [&>.marvin-card]:overflow-y-auto [&>.marvin-card]:[scrollbar-gutter:stable]"
      role="region"
      aria-busy={loading}
      aria-labelledby="day-title"
      style={{ '--detail-height': `${panelHeight}px` } as CSSProperties}
    >
      <div className="min-w-0 flex-1">
        <h2
          id="day-title"
          className="h-6 truncate text-sm leading-6 font-bold first-letter:uppercase"
        >
          {placeholder ? (
            <>
              <Skeleton className="inline-block h-5 w-[min(220px,100%)] align-middle" />
              <span className="sr-only">Загружаем выбранный день</span>
            </>
          ) : (
            formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })
          )}
        </h2>
        <div
          className="day-scroll h-[calc(var(--detail-height)-64px)] overflow-auto px-4 [scrollbar-gutter:stable] [scrollbar-width:thin]"
          tabIndex={0}
          role="region"
          aria-label="Подробное расписание выбранного дня"
        >
          <div
            className="day-timeline relative min-w-[740px] max-w-[1080px] bg-[repeating-linear-gradient(to_right,transparent,transparent_calc(100%/var(--day-divisions)-1px),var(--u-line-soft)_calc(100%/var(--day-divisions)-1px),var(--u-line-soft)_calc(100%/var(--day-divisions)))]"
            style={
              {
                height: rows * rowHeight + 40,
                '--day-divisions': (end - start) / 30,
              } as CSSProperties
            }
          >
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute top-px z-[1] -translate-x-1/2 bg-u-surface text-[11px]"
                style={{ left: `${((hour - start) * 100) / (end - start)}%` }}
              >
                {timeLabel(hour)}
              </span>
            ))}
            {loading && !schedules.some((group) => group.snapshot) ? (
              <div
                className="absolute inset-0 [&>div]:absolute"
                aria-hidden="true"
              >
                {Array.from({ length: rows }, (_, index) => (
                  <Skeleton
                    key={index}
                    style={{
                      top: index * rowHeight + 36,
                      left: '8%',
                      width: '72%',
                      height: rowHeight - 6,
                    }}
                  />
                ))}
              </div>
            ) : (
              <>
                {highlights.map((range) => (
                  <div
                    key={`${range.start}:${range.end}`}
                    className={`day-highlight absolute top-[29px] bottom-1 border-t-2 transition-colors motion-reduce:transition-none ${mode === 'free' ? 'free-highlight border-u-accent-border' : 'border-campus-presence-border'} ${saved ? `saved-highlight border-dashed ${mode === 'free' ? 'bg-[color-mix(in_oklch,var(--u-accent-soft)_25%,transparent)]' : 'bg-[color-mix(in_oklch,var(--color-campus-presence)_10%,transparent)]'}` : mode === 'free' ? 'bg-[color-mix(in_oklch,var(--u-accent-soft)_45%,transparent)]' : 'bg-[color-mix(in_oklch,var(--color-campus-presence)_25%,transparent)]'}`}
                    aria-hidden="true"
                    style={{
                      left: `${((range.start - start) * 100) / (end - start)}%`,
                      width: `${((range.end - range.start) * 100) / (end - start)}%`,
                    }}
                  />
                ))}
                {placed.map((block) => (
                  <LessonCard
                    key={block.identity}
                    block={block}
                    colors={colors}
                    subgroupCatalog={subgroupCatalog}
                    subgroupShades={subgroupShades}
                    horizontal
                    style={{
                      left: `calc(${((block.lesson.start - start) * 100) / (end - start)}% + 2px)`,
                      width: `calc(${((block.lesson.end - block.lesson.start) * 100) / (end - start)}% - 4px)`,
                      top: block.column * rowHeight + 36,
                      height: rowHeight - 6,
                    }}
                  />
                ))}
                {!placed.length && (
                  <p className="absolute top-[45px] left-3 text-[13px] text-u-muted [&>span]:mt-[5px] [&>span]:block [&>span]:text-[11px]">
                    {schedules.some((group) => group.error && !group.snapshot)
                      ? 'Часть расписаний недоступна.'
                      : schedules.some((group) => !group.snapshot)
                        ? 'Ждём данные расписания.'
                        : 'В этот день занятий нет.'}
                    {saved && schedules.every((group) => group.snapshot) && (
                      <span>По сохранённым данным</span>
                    )}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <ComparisonSummary
        schedules={schedules}
        day={day}
        mode={mode}
        loading={loading}
        placeholder={placeholder}
      />
    </Card.Root>
  );
}
