import type { ScheduleData } from '../../lib/types.ts';

export default function VucDocumentNotes({
  date,
  warnings = [],
  cells = [],
}: {
  date: string;
  warnings?: string[];
  cells?: ScheduleData['unparsedCells'];
}) {
  const current = cells.filter((cell) => cell.date === date);
  return (
    <>
      {warnings.map((warning) => (
        <p className="my-1 text-u-muted" key={warning}>
          {warning}
        </p>
      ))}
      {current.length > 0 && (
        <>
          <p className="mt-2 mb-1 font-semibold">
            Ячейки без определённого времени · {current.length}
          </p>
          <ul className="my-2 pl-5">
            {current.map((cell, index) => (
              <li className="mb-2" key={`${cell.sourceOrigin}:${index}`}>
                <p className="my-0">{cell.rawText}</p>
                <p className="my-0 text-xs text-u-muted">
                  {cell.reason} · {cell.sourceOrigin}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
