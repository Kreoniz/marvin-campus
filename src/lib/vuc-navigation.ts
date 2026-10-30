import type { Selection, VucRef } from './types.ts';
import { validDate } from './dates.ts';
import { importedDate } from './schedule-ref.ts';

export function nearestVucDate(
  selection: Selection,
  day: string,
  coveredDates: string[] = [],
  catalogue?: VucRef,
) {
  if (selection.kind !== 'vuc') return undefined;
  return (
    [
      ...new Set([
        ...coveredDates,
        ...(catalogue?.coveredDates ?? selection.coveredDates ?? []),
      ]),
    ]
      .filter(validDate)
      .sort(
        (a, b) =>
          Math.abs(Date.parse(a) - Date.parse(day)) -
            Math.abs(Date.parse(b) - Date.parse(day)) || a.localeCompare(b),
      )[0] ?? importedDate(selection)
  );
}
