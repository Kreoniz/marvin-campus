import { Card } from 'unlikely-ui/card';
import { Skeleton } from 'unlikely-ui/skeleton';
import type { GroupSchedule, Mode } from '../../../lib/types.ts';
import { formatDay, timeLabel } from '../../../lib/dates.ts';
import {
  compareDay,
  comparisonScope,
  lessonsFor,
} from '../../../lib/domain.ts';
import { selectionLabel } from '../../../lib/subgroups.ts';

interface ComparisonSummaryProps {
  schedules: GroupSchedule[];
  day: string;
  loading: boolean;
  mode: Mode;
  compact?: boolean;
  placeholder?: boolean;
  showHeading?: boolean;
}

export default function ComparisonSummary({
  schedules,
  day,
  loading,
  mode,
  compact = false,
  placeholder = false,
  showHeading = true,
}: ComparisonSummaryProps) {
  const result = compareDay(schedules, day);
  const { included, excluded } = comparisonScope(schedules);
  const comparing = included.length >= 2;
  const hasLessons = included.some((group) =>
    lessonsFor(group).some((lesson) => lesson.date === day),
  );
  const ranges = mode === 'free' ? result.free : result.presence;
  const saved = included.some(
    (group) => group.snapshot && (group.snapshot.stale || group.error),
  );
  const hasSnapshot = schedules.some((group) => group.snapshot);
  const withoutOnsite = included
    .filter(
      (group) =>
        !lessonsFor(group).some(
          (lesson) => lesson.date === day && !lesson.remote,
        ),
    )
    .map((group) => selectionLabel(group.selection));
  const times = (intervals: typeof ranges) =>
    intervals
      .map(
        (interval) => `${timeLabel(interval.start)}–${timeLabel(interval.end)}`,
      )
      .join(', ');
  return (
    <Card.Root
      className={`marvin-card grid text-u-ink ${compact ? 'compact-summary w-full grid-cols-1 gap-0 rounded-none border-0 bg-transparent p-0' : 'gap-x-3 gap-y-2 rounded-[var(--u-panel-radius)] border border-u-line bg-u-raised shadow-[var(--u-shadow-md)] dark:bg-[color-mix(in_srgb,var(--u-surface-raised)_88%,var(--u-ink))] min-h-[182px] w-[340px] shrink-0 grid-cols-[112px_minmax(0,1fr)] grid-rows-[auto_auto] content-start items-start p-4 max-[1100px]:w-[300px] max-[1100px]:grid-cols-[96px_minmax(0,1fr)] max-[1100px]:p-3.5'}`}
      role="complementary"
      aria-label="Результат сравнения"
      aria-busy={loading}
    >
      {!compact && (
        <img
          className="size-28 object-contain max-[1100px]:size-24"
          src="/assets/mascot-m2-thinking-v1.webp"
          width="150"
          height="150"
          alt="Робот задумался над расписанием"
        />
      )}
      <div className="marvin-result relative min-w-0 self-start text-xs leading-snug [overflow-wrap:anywhere] [&>strong]:text-[13px] [&>strong]:font-bold [&>p]:my-1">
        <div
          className={`summary-date mb-2 text-[10px] font-semibold capitalize ${compact ? 'hidden' : ''}`}
        >
          {placeholder ? (
            <Skeleton className="inline-block h-3 w-[75px] align-middle" />
          ) : (
            formatDay(day, { weekday: 'short', day: 'numeric', month: 'short' })
          )}
        </div>
        {!!excluded.length && (
          <div
            className="comparison-scope mb-2 text-xs leading-snug"
            role="status"
          >
            <strong>
              {comparing
                ? `Частичное сравнение · ${included.length} из ${schedules.length}`
                : `Доступно расписаний: ${included.length} из ${schedules.length}`}
            </strong>
            {!!included.length && (
              <p className="my-1">
                Учтены:{' '}
                {included
                  .map((group) => selectionLabel(group.selection))
                  .join(' + ')}
              </p>
            )}
            <p className="my-1">
              Не учтены:{' '}
              {excluded
                .map((group) => selectionLabel(group.selection))
                .join(', ')}
            </p>
          </div>
        )}
        {loading && !hasSnapshot ? (
          <>
            <div
              className="grid gap-3 [&>div]:h-4 [&>div:last-child]:w-[65%]"
              aria-hidden="true"
            >
              <Skeleton />
              <Skeleton />
            </div>
            <span className="sr-only">Загружаем результат сравнения.</span>
          </>
        ) : schedules.length < 2 ? (
          <strong>Твоё расписание</strong>
        ) : !comparing ? (
          <>
            <strong>Совместный результат недоступен</strong>
            <p>Для сравнения нужны хотя бы два доступных расписания.</p>
          </>
        ) : !hasLessons ? (
          <>
            <strong>На этот день занятий нет.</strong>
            <p>Выбери другой день — проверим общее время.</p>
          </>
        ) : compact ? (
          <>
            {showHeading && (
              <strong>
                {mode === 'free'
                  ? 'Общий перерыв в вузе'
                  : 'Общее время в вузе'}
              </strong>
            )}
            <p className="result-time text-base leading-snug font-extrabold tracking-[-0.3px]">
              {ranges.length
                ? times(ranges)
                : mode === 'free'
                  ? 'Общего перерыва в вузе нет'
                  : 'Нет общего времени'}
            </p>
            {mode === 'presence' && !!result.free.length && (
              <p>Без занятий: {times(result.free)}</p>
            )}
          </>
        ) : (
          <>
            <strong>Общее время в вузе:</strong>
            <p className="result-time text-base leading-snug font-extrabold tracking-[-0.3px]">
              {result.presence.length
                ? times(result.presence)
                : 'Нет общего времени'}
            </p>
            <strong>Общий перерыв в вузе:</strong>
            <p className="result-time text-base leading-snug font-extrabold tracking-[-0.3px]">
              {result.free.length
                ? times(result.free)
                : 'Общего перерыва в вузе нет'}
            </p>
            {!!result.lessons.length && (
              <span className="shared-count">
                Общих пар: {result.lessons.length}
              </span>
            )}
          </>
        )}
        {comparing && hasLessons && !result.presence.length && (
          <p className="presence-reason text-xs leading-snug text-u-ink">
            {withoutOnsite.length === 1
              ? `У ${withoutOnsite[0]} в этот день нет очных занятий.`
              : withoutOnsite.length
                ? `В этот день нет очных занятий у ${withoutOnsite.length} выбранных групп.`
                : 'Время присутствия выбранных групп в вузе не пересекается.'}
          </p>
        )}
        {(!compact || saved) && (
          <p className="saved-qualification mt-[5px] text-[11px] text-u-ink">
            {saved
              ? 'По сохранённым данным'
              : comparing
                ? 'По расписанию'
                : '\u00a0'}
          </p>
        )}
      </div>
      {!compact && (
        <p className="col-span-full m-0 border-t border-u-line pt-1.5 text-right text-[10px] leading-3 text-u-ink">
          {result.free.length
            ? 'Даже у вселенной бывают окна.'
            : 'Время — иллюзия. Расписание — чуть сложнее.'}
        </p>
      )}
    </Card.Root>
  );
}
