const base = ['blue', 'coral', 'sage', 'lilac', 'peach', 'aqua'];
const count = 30;
export type GroupColors = Record<number, number>;

// Keep active groups' colors; resolve collisions only for newly added groups.
export function assignColors(
  ids: number[],
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
    let color = (id + 5) % base.length;
    if (used.has(color))
      color = Array.from({ length: count }, (_, i) => i).find(
        (i) => !used.has(i),
      )!;
    result[id] = color;
    used.add(color);
  }
  return result;
}

export function colorStyle(color: number): string {
  if (color < base.length) return `--chip:var(--${base[color]})`;
  const hue = Math.round((color - base.length) * 137.508) % 360;
  return `--chip:light-dark(hsl(${hue} 55% 82%),hsl(${hue} 38% 69%))`;
}
