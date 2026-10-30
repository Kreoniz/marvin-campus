import { Button } from 'unlikely-ui/button';
import type { GroupSchedule, Selection } from '../../lib/types.ts';
import { formatDay, validDate } from '../../lib/dates.ts';
import { importedDate, scheduleKey } from '../../lib/schedule-ref.ts';

export function nearestVucDate(selection: Selection, day: string) {
  if (selection.kind !== 'vuc') return undefined;
  return (
    selection.coveredDates
      ?.filter(validDate)
      .sort(
        (a, b) =>
          Math.abs(Date.parse(a) - Date.parse(day)) -
            Math.abs(Date.parse(b) - Date.parse(day)) || a.localeCompare(b),
      )[0] ?? importedDate(selection)
  );
}

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
        const date = nearestVucDate(schedule.selection, day);
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
          ВУЦ: расписание из документов, не онлайн
        </summary>
        {sources.map((schedule) => {
          const data = schedule.snapshot?.data;
          const covered = data?.coveredDates?.includes(day);
          const unresolved = data?.unresolvedDates?.includes(day);
          const first = nearestVucDate(schedule.selection, day);
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
