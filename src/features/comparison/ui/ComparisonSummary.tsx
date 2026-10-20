import { Card } from 'unlikely-ui/card';
import { Skeleton } from 'unlikely-ui/skeleton';
import type { GroupSchedule, Mode } from '../../../lib/types.ts';
import { formatDay, timeLabel } from '../../../lib/dates.ts';
import { compareDay, lessonsFor } from '../../../lib/domain.ts';
import '../../../components/schedule.css';

interface ComparisonSummaryProps {
  schedules: GroupSchedule[];
  day: string;
  loading: boolean;
  mode: Mode;
  compact?: boolean;
  placeholder?: boolean;
}

export default function ComparisonSummary({
  schedules,
  day,
  loading,
  mode,
  compact = false,
  placeholder = false,
}: ComparisonSummaryProps) {
  const result = compareDay(schedules, day);
  const hasLessons = schedules.some((group) =>
    lessonsFor(group).some((lesson) => lesson.date === day),
  );
  const ranges = mode === 'free' ? result.free : result.presence;
  const saved = schedules.some(
    (group) => group.snapshot && (group.snapshot.stale || group.error),
  );
  const hasSnapshot = schedules.some((group) => group.snapshot);
  const withoutOnsite = schedules
    .filter(
      (group) =>
        !lessonsFor(group).some(
          (lesson) => lesson.date === day && !lesson.remote,
        ),
    )
    .map((group) => group.selection.label);
  const times = (intervals: typeof ranges) =>
    intervals
      .map(
        (interval) => `${timeLabel(interval.start)}–${timeLabel(interval.end)}`,
      )
      .join(', ');
  return (
    <Card.Root
      className={`marvin-card${compact ? ' compact-summary' : ''}`}
      role="complementary"
      aria-label="Результат сравнения"
      aria-busy={loading}
    >
      {!compact && (
        <img
          src="/assets/mascot-m2-thinking-v1.webp"
          width="150"
          height="150"
          alt="Робот задумался над расписанием"
        />
      )}
      <div className="marvin-result">
        <div className="summary-date">
          {placeholder ? (
            <Skeleton className="summary-date-placeholder" />
          ) : (
            formatDay(day, { weekday: 'short', day: 'numeric', month: 'short' })
          )}
        </div>
        {loading && !hasSnapshot ? (
          <>
            <div className="summary-skeleton" aria-hidden="true">
              <Skeleton />
              <Skeleton />
            </div>
            <span className="sr-only">Загружаем результат сравнения.</span>
          </>
        ) : schedules.length < 2 ? (
          <>
            <strong>Твоё расписание</strong>
            <p>Добавь группу друга — найдём время пересечься.</p>
          </>
        ) : !result.complete ? (
          <>
            <strong>Нужны все расписания</strong>
            <p>Без данных одной из групп сравнение не получится.</p>
          </>
        ) : !hasLessons ? (
          <>
            <strong>На этот день занятий нет.</strong>
            <p>Выбери другой день — проверим общее время.</p>
          </>
        ) : compact ? (
          <>
            <strong>
              {mode === 'free' ? 'Все без занятий' : 'Общее время в вузе'}
            </strong>
            <p className="result-time">
              {ranges.length
                ? times(ranges)
                : mode === 'free'
                  ? 'Нет общего времени без занятий'
                  : 'Нет общего времени'}
            </p>
            {mode === 'presence' && !!result.free.length && (
              <p>Без занятий: {times(result.free)}</p>
            )}
          </>
        ) : (
          <>
            <strong>Общее время в вузе:</strong>
            <p className="result-time">
              {result.presence.length
                ? times(result.presence)
                : 'Нет общего времени'}
            </p>
            <strong>Все без занятий:</strong>
            <p className="result-time">
              {result.free.length
                ? times(result.free)
                : 'Нет общего времени без занятий'}
            </p>
            {!!result.lessons.length && (
              <span className="shared-count">
                Общих пар: {result.lessons.length}
              </span>
            )}
          </>
        )}
        {result.complete && hasLessons && !result.presence.length && (
          <p className="presence-reason">
            {withoutOnsite.length === 1
              ? `У ${withoutOnsite[0]} в этот день нет очных занятий.`
              : withoutOnsite.length
                ? `В этот день нет очных занятий у ${withoutOnsite.length} выбранных групп.`
                : 'Время присутствия выбранных групп в вузе не пересекается.'}
          </p>
        )}
        <p className="saved-qualification">
          {saved
            ? 'По сохранённым данным'
            : result.complete
              ? 'По расписанию'
              : '\u00a0'}
        </p>
      </div>
      {!compact && (
        <p className="marvin-caption">
          {result.free.length
            ? 'Даже у вселенной бывают окна.'
            : 'Время — иллюзия. Расписание — чуть сложнее.'}
        </p>
      )}
    </Card.Root>
  );
}
