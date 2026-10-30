import { Button } from 'unlikely-ui/button';
import { useQuery } from '@tanstack/react-query';
import { vucSearchOptions } from './api.ts';
import { nearestVucDate } from '../../lib/vuc-navigation.ts';
import type { GroupSchedule } from '../../lib/types.ts';
import { formatDay } from '../../lib/dates.ts';
import { scheduleKey } from '../../lib/schedule-ref.ts';

export default function VucSources({
  schedules,
  day,
  onSelectDate,
}: {
  schedules: GroupSchedule[];
  day: string;
  onSelectDate: (date: string) => void;
}) {
  const sources = schedules.filter(
    (schedule) => schedule.selection.kind === 'vuc',
  );
  const catalogue = useQuery({
    ...vucSearchOptions(''),
    enabled: sources.length > 0,
  });
  const nearest = (schedule: GroupSchedule) =>
    nearestVucDate(
      schedule.selection,
      day,
      schedule.snapshot?.data.coveredDates,
      catalogue.data?.data.find((ref) => ref.id === schedule.selection.id),
    );
  const years = [
    ...new Set(
      sources.flatMap((schedule) => {
        const selection = schedule.selection;
        const period =
          schedule.snapshot?.data.sourcePeriod ||
          (selection.kind === 'vuc' ? selection.sourcePeriod : '') ||
          '';
        return (
          period.match(/\b(?:19|20)\d{2}\b/g) ??
          (selection.kind === 'vuc'
            ? [
                selection.firstDate?.slice(0, 4),
                selection.lastDate?.slice(0, 4),
              ].filter((year): year is string => !!year)
            : [])
        );
      }),
    ),
  ].sort();
  const yearLabel = years.length > 1 ? `${years[0]}–${years.at(-1)}` : years[0];
  if (!sources.length) return null;
  return (
    <section
      className="vuc-sources border-t border-u-line-soft px-3 py-2 text-[13px] leading-relaxed"
      aria-label="Источники ВУЦ"
    >
      {sources.map((schedule) => {
        if (
          !schedule.snapshot ||
          schedule.snapshot.data.coveredDates?.includes(day)
        )
          return null;
        const date = nearest(schedule);
        return (
          <div
            className="mb-1 flex flex-wrap items-center justify-between gap-2"
            key={scheduleKey(schedule.selection)}
          >
            <span>
              {schedule.selection.label}:{' '}
              {schedule.snapshot.data.unresolvedDates?.includes(day)
                ? 'часть ячеек требует сверки'
                : 'нет данных на этот день'}
              .
            </span>
            {date && date !== day && (
              <Button
                size="sm"
                variant="secondary"
                className="min-h-9 text-xs"
                onClick={() => onSelectDate(date)}
              >
                Открыть{' '}
                {formatDay(date, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Button>
            )}
          </div>
        );
      })}
      <details>
        <summary className="cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-u-ink">
          ВУЦ · документы{yearLabel && ` ${yearLabel}`} · не онлайн
        </summary>
        {sources.map((schedule) => {
          const data = schedule.snapshot?.data;
          const covered = data?.coveredDates?.includes(day);
          const unresolved = data?.unresolvedDates?.includes(day);
          const first = nearest(schedule);
          const cells =
            data?.unparsedCells?.filter((cell) => cell.date === day) ?? [];
          return (
            <div
              className="mt-2 border-t border-u-line-soft pt-2"
              key={scheduleKey(schedule.selection)}
            >
              <strong>{schedule.selection.label}</strong>
              <p className="my-1 text-u-muted">
                {data?.sourceLabel ||
                  (schedule.selection.kind === 'vuc' &&
                    schedule.selection.sourceLabel)}{' '}
                {data?.sourcePeriod ||
                  (schedule.selection.kind === 'vuc' &&
                    schedule.selection.sourcePeriod)}
              </p>
              <p className="my-1">
                {unresolved
                  ? 'В документе есть неоднозначные ячейки на этот день. Пары показаны, расчёт этого взвода ограничен.'
                  : covered
                    ? 'На этот день есть строки документа.'
                    : `Нет подтверждённых данных на ${formatDay(day, { day: 'numeric', month: 'long', year: 'numeric' })}.`}
              </p>
              {!covered && first && first !== day && (
                <Button
                  size="sm"
                  variant="secondary"
                  className="min-h-9 text-xs"
                  onClick={() => onSelectDate(first)}
                >
                  Открыть{' '}
                  {formatDay(first, {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Button>
              )}
              {(
                data?.warnings ||
                (schedule.selection.kind === 'vuc' &&
                  schedule.selection.warnings) ||
                []
              ).map((warning) => (
                <p className="my-1 text-u-muted" key={warning}>
                  {warning}
                </p>
              ))}
              {cells.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer">
                    Ячейки без определённого времени · {cells.length}
                  </summary>
                  <ul className="my-2 pl-5">
                    {cells.map((cell, index) => (
                      <li
                        className="mb-2"
                        key={`${cell.sourceOrigin}:${index}`}
                      >
                        <p className="my-0">{cell.rawText}</p>
                        <p className="my-0 text-xs text-u-muted">
                          {cell.reason} · {cell.sourceOrigin}
                        </p>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          );
        })}
      </details>
    </section>
  );
}
