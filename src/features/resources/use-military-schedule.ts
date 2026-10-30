import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vucWeekOptions } from './api.ts';
import { useResourceInspector } from './ResourceInspector.tsx';
import { snapshotChangeAt, usableSnapshot } from '../../lib/cache-policy.ts';
import { monday, timeLabel } from '../../lib/dates.ts';
import { nearestVucDate } from '../../lib/vuc-navigation.ts';
import type { Lesson, VucRef } from '../../lib/types.ts';
import useVucCatalogue from './use-vuc-catalogue.ts';

export default function useMilitarySchedule(date: string) {
  const { schedules, militaryId, selectMilitary } = useResourceInspector();
  const {
    query: catalogue,
    entries: catalogueEntries,
    expired,
  } = useVucCatalogue();
  const selected = schedules.filter((row) => row.selection.kind === 'vuc');
  const available = [
    ...new Map(
      [
        ...selected.map((row) => row.selection as VucRef),
        ...catalogueEntries,
      ].map((ref) => [ref.id, ref]),
    ).values(),
  ].sort((a, b) => {
    const distance = (item: VucRef) => {
      const nearest = nearestVucDate(item, date);
      return nearest
        ? Math.abs(Date.parse(nearest) - Date.parse(date))
        : Infinity;
    };
    return (
      distance(a) - distance(b) ||
      a.label.localeCompare(b.label, 'ru', { numeric: true })
    );
  });
  const preferred =
    militaryId ?? (selected.length === 1 ? selected[0].selection.id : '');
  const ref = available.find((item) => item.id === preferred);
  const result = useQuery({
    ...vucWeekOptions(
      ref ?? { kind: 'vuc', id: 'unselected', label: 'ВУЦ' },
      monday(date),
    ),
    enabled: !!ref,
  });
  const [clock, setClock] = useState(Date.now);
  const now = Math.max(clock, Date.now());
  const changeAt = snapshotChangeAt(result.data, monday(date), now);
  useEffect(() => {
    if (changeAt === undefined) return;
    const timer = setTimeout(
      () => setClock(Date.now()),
      Math.min(2147483647, Math.max(1, changeAt - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [changeAt]);
  const snapshot = usableSnapshot(result.data, monday(date), now);
  const data = snapshot?.data;
  const originalAvailable =
    data?.originalAvailable ??
    catalogueEntries.find((item) => item.id === ref?.id)?.originalAvailable ??
    ref?.originalAvailable;
  const lessons = (data?.lessons ?? [])
    .filter((lesson) => lesson.date === date)
    .sort(
      (a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id),
    );
  const covered = data?.coveredDates.includes(date);
  const unresolved = data?.unresolvedDates?.includes(date);
  const nearest =
    ref &&
    nearestVucDate(
      ref,
      date,
      data?.coveredDates,
      catalogueEntries.find((item) => item.id === ref.id),
    );
  const hasNotes =
    !!data?.warnings?.length ||
    data?.unparsedCells?.some((cell) => cell.date === date);
  const times = (lesson: Lesson) =>
    (lesson.sourceIntervals?.length ? lesson.sourceIntervals : [lesson])
      .map((range) => `${timeLabel(range.start)}–${timeLabel(range.end)}`)
      .join(', ');
  return {
    catalogue,
    expired,
    available,
    ref,
    result,
    snapshot,
    data,
    originalAvailable,
    lessons,
    covered,
    unresolved,
    nearest,
    hasNotes,
    times,
    selectMilitary,
  };
}
