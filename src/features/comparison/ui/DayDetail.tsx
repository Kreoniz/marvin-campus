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
import '../../../components/schedule.css';

interface DayDetailProps {
  schedules: GroupSchedule[];
  colors: GroupColors;
  subgroupCatalog?: Record<number, Subgroup[]>;
  day: string;
  mode: Mode;
  loading: boolean;
  placeholder?: boolean;
}

export default function DayDetail({
  schedules,
  colors,
  subgroupCatalog = {},
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
      className="day-detail"
      role="region"
      aria-busy={loading}
      aria-labelledby="day-title"
      style={{ '--detail-height': `${panelHeight}px` } as CSSProperties}
    >
      <div className="day-main">
        <h2 id="day-title">
          {placeholder ? (
            <>
              <Skeleton className="detail-title-placeholder" />
              <span className="sr-only">Загружаем выбранный день</span>
            </>
          ) : (
            formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })
          )}
        </h2>
        <div
          className="day-scroll"
          tabIndex={0}
          role="region"
          aria-label="Подробное расписание выбранного дня"
        >
          <div
            className="day-timeline"
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
                className="day-hour"
                style={{ left: `${((hour - start) * 100) / (end - start)}%` }}
              >
                {timeLabel(hour)}
              </span>
            ))}
            {loading && !schedules.some((group) => group.snapshot) ? (
              <div className="day-skeleton" aria-hidden="true">
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
                    className={`day-highlight${mode === 'free' ? ' free-highlight' : ''}${saved ? ' saved-highlight' : ''}`}
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
                  <p className="day-empty">
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
