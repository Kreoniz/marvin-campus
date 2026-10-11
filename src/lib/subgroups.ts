import type { Lesson, Selection, Subgroup } from './types.ts';

export function publicSubgroup(label: string): number | undefined {
  const value = Number(/\/(\d{1,2})$/.exec(label)?.[1]);
  return value > 0 ? value : undefined;
}

export function selectedSubgroup(
  selection: Selection,
  subgroups: Subgroup[],
): number | undefined {
  if (selection.subgroup !== undefined) return selection.subgroup;
  if (selection.subgroupNumber === undefined) return undefined;
  // Unknown public numbers include only whole-group lessons, never all subgroups.
  return (
    subgroups.find((s) => publicSubgroup(s.label) === selection.subgroupNumber)
      ?.id ?? -1
  );
}

// Public numbers come from the group's catalog, never from source IDs.
// A selected subgroup is also the viewing context for whole-group lessons.
export function lessonGroupLabel(
  selection: Selection,
  lessons: Lesson[],
  catalog: Subgroup[],
): string {
  const selected =
    selection.subgroupNumber ??
    publicSubgroup(
      catalog.find((s) => s.id === selection.subgroup)?.label ?? '',
    );
  if (selected !== undefined) return `${selection.label}/${selected}`;
  if (lessons.some((lesson) => !lesson.subgroups.length))
    return selection.label;
  const ids = new Set(lessons.flatMap((lesson) => lesson.subgroups));
  const numbers = [
    ...new Set(
      catalog.filter((s) => ids.has(s.id)).map((s) => publicSubgroup(s.label)),
    ),
  ]
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => a - b);
  return numbers.length
    ? `${selection.label}/${numbers.join(',')}`
    : selection.label;
}

// The source lists only subgroups with lessons in the requested week.
// An empty week must not erase an existing selection or its public name.
export function mergeSubgroups(
  known: Subgroup[],
  incoming: Subgroup[],
): Subgroup[] {
  return [
    ...new Map([...known, ...incoming].map((item) => [item.id, item])).values(),
  ].sort((a, b) => a.label.localeCompare(b.label, 'ru', { numeric: true }));
}

export function savedSubgroups(): Record<number, Subgroup[]> {
  try {
    const raw = JSON.parse(localStorage.getItem('campus-subgroups') ?? '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw)
        .slice(0, 30)
        .flatMap(([key, value]) => {
          if (
            !Number.isSafeInteger(Number(key)) ||
            Number(key) <= 0 ||
            !Array.isArray(value)
          )
            return [];
          const items = value
            .slice(0, 100)
            .filter(
              (item): item is Subgroup =>
                item &&
                Number.isSafeInteger(item.id) &&
                item.id > 0 &&
                typeof item.label === 'string' &&
                item.label.length > 0 &&
                item.label.length <= 80,
            );
          return [[Number(key), items]];
        }),
    );
  } catch {
    return {};
  }
}
