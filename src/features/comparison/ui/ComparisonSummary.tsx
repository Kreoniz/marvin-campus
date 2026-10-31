import { Card } from 'unlikely-ui/card';
import { Skeleton } from 'unlikely-ui/skeleton';
import type { GroupSchedule, Mode, ScheduleKind } from '../../../lib/types.ts';
import { formatDay, timeLabel } from '../../../lib/dates.ts';
import {
  compareDay,
  comparisonScope,
  lessonsFor,
} from '../../../lib/domain.ts';
import { participates, selectionKind } from '../../../lib/schedule-ref.ts';
import { scheduleLabels } from '../../../lib/selection-labels.ts';

interface Props {
  schedules: GroupSchedule[];
  hiddenKinds?: ScheduleKind[];
  day: string;
  loading: boolean;
  mode: Mode;
  compact?: boolean;
  placeholder?: boolean;
}

export default function ComparisonSummary({
  schedules,
  hiddenKinds = [],
  day,
  loading,
  mode,
  compact = false,
  placeholder = false,
}: Props) {
  const label = scheduleLabels(schedules);
  const { included, excluded, overlays } = comparisonScope(schedules, day);
  const eligible = schedules.filter((row) => participates(row.selection));
  if (eligible.length < 2 && !excluded.length) return null;
  const result = compareDay(schedules, day);
  const comparing = included.length >= 2;
  const saved = included.some(
    (row) => row.snapshot && (row.snapshot.stale || row.error),
  );
  const pending =
    (loading || placeholder) && !schedules.some((row) => row.snapshot);
  const teachers = schedules.some(
    (row) => selectionKind(row.selection) === 'lecturer',
  );
  const withoutOnsite = included.filter(
    (row) =>
      !lessonsFor(row).some((lesson) => lesson.date === day && !lesson.remote),
  );
  const explanation = withoutOnsite.length
    ? `Нет очных занятий: ${withoutOnsite.map((row) => label(row.selection)).join(', ')}.`
    : 'Время присутствия выбранных участников не пересекается.';
  const times = (ranges: typeof result.presence) =>
    ranges
      .map((range) => `${timeLabel(range.start)}–${timeLabel(range.end)}`)
      .join(', ');
  return (
    <Card.Root
      className={`marvin-card text-u-ink ${compact ? 'compact-summary border-0 rounded-none bg-transparent p-0' : 'w-[300px] shrink-0 self-start rounded-(--u-panel-radius) border-u-line bg-u-surface p-3'}`}
      role="complementary"
      aria-label="Результат сравнения"
      aria-busy={pending}
    >
      {!compact && (
        <p className="summary-date m-0 mb-2 text-xs text-u-muted">
          {formatDay(day, { weekday: 'short', day: 'numeric', month: 'short' })}
        </p>
      )}
      {pending ? (
        <Skeleton className="h-8 w-full" />
      ) : (
        <>
          {excluded.length > 0 && (
            <span className="mb-1 block text-xs font-semibold text-u-warning">
              Частично · {included.length} из {eligible.length}
            </span>
          )}
          {!comparing ? (
            <p className="m-0 text-sm font-semibold">
              Общий результат недоступен
            </p>
          ) : !result.presence.length ? (
            <p className="m-0 text-sm font-semibold">
              Нет общего времени в вузе
            </p>
          ) : (
            <div className="grid gap-1 text-sm">
              {(mode === 'free'
                ? (['free', 'presence'] as const)
                : (['presence', 'free'] as const)
              ).map((layer) => (
                <p className="result-time m-0 leading-relaxed" key={layer}>
                  <span className="text-u-muted">
                    {layer === 'free' ? 'Общие окна' : 'В вузе'}:{' '}
                  </span>
                  <strong className="font-semibold">
                    {result[layer].length ? times(result[layer]) : 'нет'}
                  </strong>
                </p>
              ))}
            </div>
          )}
          <details className="comparison-scope mt-1 text-xs leading-relaxed">
            <summary className="min-h-8 cursor-pointer rounded-sm py-1.5 text-u-muted focus-visible:outline-2 focus-visible:outline-u-ink">
              {saved ? 'Сохранённые данные · подробнее' : 'Состав и пояснения'}
            </summary>
            <div className="space-y-1 pb-1 [&>p]:m-0">
              {included.length > 0 && (
                <p>
                  Учтены:{' '}
                  {included.map((row) => label(row.selection)).join(', ')}.
                </p>
              )}
              {excluded.length > 0 && (
                <p>
                  Не учтены:{' '}
                  {excluded.map((row) => label(row.selection)).join(', ')}.
                </p>
              )}
              {overlays.length > 0 && (
                <p>
                  Аудитории показывают занятость и не участвуют в расчёте:{' '}
                  {overlays.map((row) => label(row.selection)).join(', ')}.
                </p>
              )}
              {teachers && (
                <p>Для преподавателей учтены только учебные занятия.</p>
              )}
              {hiddenKinds.length > 0 && (
                <p>Скрытие карточек не меняет состав расчёта.</p>
              )}
              {comparing && !result.presence.length && (
                <p className="presence-reason">{explanation}</p>
              )}
              {saved && (
                <p className="saved-qualification">По сохранённым данным.</p>
              )}
            </div>
          </details>
        </>
      )}
    </Card.Root>
  );
}
