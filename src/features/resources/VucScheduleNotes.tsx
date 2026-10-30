import type { GroupSchedule } from '../../lib/types.ts';
import { formatDay } from '../../lib/dates.ts';
import VucDocumentNotes from './VucDocumentNotes.tsx';

// Lives in the existing per-source data-status disclosure, beside calculation
// status. The footer only downloads documents; it does not repeat these rows.
export default function VucScheduleNotes({
  schedule,
  date,
}: {
  schedule: GroupSchedule;
  date?: string;
}) {
  if (schedule.selection.kind !== 'vuc') return null;
  const data = schedule.snapshot?.data;
  const unresolved = !!date && data?.unresolvedDates?.includes(date);
  const covered = !!date && data?.coveredDates?.includes(date) && !unresolved;
  return (
    <div className="mt-1 text-xs leading-relaxed text-u-muted">
      {(!schedule.snapshot?.warning || schedule.error) && (
        <p className="my-1">
          Документ. Актуальность на сайте ВУЦ не проверена.
        </p>
      )}
      {date && (
        <p className="my-1">
          {formatDay(date, { day: 'numeric', month: 'long', year: 'numeric' })}:{' '}
          {unresolved
            ? 'есть неоднозначные строки. Известные занятия показаны; взвод исключён из расчёта на этот день.'
            : covered
              ? 'есть подтверждённые строки документа.'
              : 'нет подтверждённых данных. Взвод исключён из расчёта на этот день.'}
        </p>
      )}
      <details className="mt-1">
        <summary className="min-h-8 cursor-pointer rounded-sm py-1.5 focus-visible:outline-2 focus-visible:outline-u-ink">
          Примечания документа
        </summary>
        <p className="my-1">
          {data?.sourceLabel || schedule.selection.sourceLabel}
        </p>
        <p className="my-1">
          {data?.sourcePeriod ||
            schedule.selection.sourcePeriod ||
            schedule.selection.description}
        </p>
        {date && (
          <VucDocumentNotes
            date={date}
            warnings={data?.warnings}
            cells={data?.unparsedCells}
          />
        )}
      </details>
    </div>
  );
}
