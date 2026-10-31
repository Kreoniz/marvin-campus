import type { GroupSelection, ScheduleKind, Selection } from './types.ts';
import { validDate } from './dates.ts';

export const scheduleKinds: ScheduleKind[] = [
  'group',
  'lecturer',
  'auditorium',
  'vuc',
];
export const selectionKind = (selection: Selection): ScheduleKind =>
  selection.kind ?? 'group';
export function isGroup(selection: Selection): selection is GroupSelection {
  return selectionKind(selection) === 'group';
}
export function scheduleKey(selection: Selection): string {
  return selection.kind === 'vuc'
    ? `vuc:platoon:${selection.id}`
    : `rasp:${selectionKind(selection)}:${selection.id}`;
}
export function compareScheduleRefs(a: Selection, b: Selection): number {
  const kind = selectionKind(a).localeCompare(selectionKind(b));
  if (kind) return kind;
  return typeof a.id === 'number' && typeof b.id === 'number'
    ? a.id - b.id
    : String(a.id).localeCompare(String(b.id));
}
export function kindLabel(kind: ScheduleKind): string {
  return {
    group: 'Группа',
    lecturer: 'Преподаватель',
    auditorium: 'Аудитория',
    vuc: 'ВУЦ',
  }[kind];
}
export function kindIcon(kind: ScheduleKind): string {
  return {
    group: 'groups',
    lecturer: 'teacher',
    auditorium: 'room',
    vuc: 'calendar',
  }[kind];
}
export function participates(selection: Selection): boolean {
  return selectionKind(selection) !== 'auditorium';
}
// Validate persisted/URL selections before they enter request paths or identity maps.
export function validSelection(value: unknown): value is Selection {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  const kind = s.kind ?? 'group';
  if (
    !scheduleKinds.includes(kind as ScheduleKind) ||
    typeof s.label !== 'string' ||
    !s.label.trim() ||
    s.label.length > 160 ||
    (s.description !== undefined &&
      (typeof s.description !== 'string' || s.description.length > 1000))
  )
    return false;
  if (kind === 'vuc') {
    return (
      (s.source === undefined || s.source === 'vuc') &&
      typeof s.id === 'string' &&
      /^[a-z0-9][a-z0-9._-]{0,99}$/.test(s.id) &&
      s.subgroup === undefined &&
      s.subgroupNumber === undefined &&
      (s.firstDate === undefined ||
        (typeof s.firstDate === 'string' && validDate(s.firstDate))) &&
      (s.lastDate === undefined ||
        (typeof s.lastDate === 'string' && validDate(s.lastDate))) &&
      (s.coveredDates === undefined ||
        (Array.isArray(s.coveredDates) &&
          s.coveredDates.length <= 200 &&
          s.coveredDates.every(
            (date) => typeof date === 'string' && validDate(date),
          )))
    );
  }
  return (
    (s.source === undefined || s.source === 'rasp') &&
    Number.isInteger(s.id) &&
    Number(s.id) > 0 &&
    Number(s.id) <= 10000000 &&
    (kind === 'group'
      ? (s.subgroup === undefined ||
          (Number.isInteger(s.subgroup) &&
            Number(s.subgroup) > 0 &&
            Number(s.subgroup) <= 99999999)) &&
        (s.subgroupNumber === undefined ||
          (Number.isInteger(s.subgroupNumber) &&
            Number(s.subgroupNumber) > 0 &&
            Number(s.subgroupNumber) < 100))
      : s.subgroup === undefined && s.subgroupNumber === undefined)
  );
}
export function importedDate(selection: Selection): string | undefined {
  return selection.kind === 'vuc' &&
    selection.firstDate &&
    validDate(selection.firstDate)
    ? selection.firstDate
    : undefined;
}

export function compactVucLabel(label: string): string {
  return label
    .replace(/^ВУЦ\s*[·-]?\s*взвод\s*/iu, 'ВУЦ ')
    .replace(/^взвод\s*/iu, 'ВУЦ ');
}
