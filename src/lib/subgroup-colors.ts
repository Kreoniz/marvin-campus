import { colorStyle } from './colors.ts';
import { publicSubgroup } from './subgroups.ts';
import type { Lesson, Subgroup } from './types.ts';

// Color describes source membership, never the selected subgroup filter.
export function lessonSubgroupNumber(
  lessons: readonly Lesson[],
  catalog: readonly Subgroup[],
): number | undefined {
  if (lessons.some((lesson) => lesson.subgroups.length === 0)) return undefined;
  const ids = new Set(lessons.flatMap((lesson) => lesson.subgroups));
  if (ids.size !== 1) return undefined;
  const [id] = ids;
  const numbers = new Set(
    catalog
      .filter((subgroup) => subgroup.id === id)
      .map((subgroup) => publicSubgroup(subgroup.label)),
  );
  return numbers.size === 1 ? [...numbers][0] : undefined;
}

export function subgroupChipStyle(
  color: number,
  subgroupNumber: number | undefined,
  enabled = false,
): Record<'--chip-base' | '--chip', string> {
  const base = colorStyle(color).slice('--chip:'.length);
  // Keep the current palette readable with its dark ink in both themes.
  const lightness =
    subgroupNumber === 1
      ? 'min(0.96, calc(l + 0.04))'
      : subgroupNumber === 2
        ? 'max(0.7, calc(l - 0.04))'
        : undefined;
  return {
    // Saved-data styling can use the unchanged group color.
    '--chip-base': base,
    '--chip':
      enabled && lightness
        ? `oklch(from var(--chip-base) ${lightness} c h)`
        : base,
  };
}
