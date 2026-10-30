const base = [1, 6, 3, 2, 4, 5];
const count = 30;
export type GroupColors = Record<string, number>;

// Keep active groups' colors; resolve collisions only for newly added groups.
export function assignColors(
  ids: (number | string)[],
  previous: GroupColors = {},
): GroupColors {
  const result: GroupColors = {};
  const used = new Set<number>();
  for (const id of ids) {
    const color = previous[id];
    if (
      Number.isInteger(color) &&
      color >= 0 &&
      color < count &&
      !used.has(color)
    ) {
      result[id] = color;
      used.add(color);
    }
  }
  for (const id of ids) {
    if (result[id] !== undefined) continue;
    const raw =
      typeof id === 'number'
        ? id
        : /^rasp:group:\d+$/.test(id)
          ? Number(id.split(':').at(-1))
          : [...id].reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 0);
    let color = (raw + 5) % base.length;
    if (used.has(color))
      color = Array.from({ length: count }, (_, i) => i).find(
        (i) => !used.has(i),
      )!;
    result[id] = color;
    used.add(color);
  }
  return result;
}

export function chipColor(color: number): string {
  const hue = Math.round((color - base.length) * 137.508) % 360;
  return color < base.length
    ? `var(--u-category-${base[color]})`
    : `light-dark(hsl(${hue} 55% 82%),hsl(${hue} 38% 69%))`;
}

export function lessonColor(color: number, subdued: boolean): string {
  const value = chipColor(color);
  return subdued
    ? `light-dark(color-mix(in srgb,${value} 50%,var(--u-surface)),color-mix(in srgb,${value} 45%,var(--u-well)))`
    : value;
}
