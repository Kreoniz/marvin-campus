export interface DayColumn {
  date: string;
  left: number;
  width: number;
}
export interface DayAnchor {
  date: string;
  offset: number;
}
const clamp = (value: number, max: number) => Math.max(0, Math.min(value, max));

export function dayAnchor(
  columns: DayColumn[],
  scroll: number,
  rail: number,
): DayAnchor | undefined {
  const edge = scroll + rail;
  const column =
    columns.find((item) => item.left + item.width > edge) ?? columns.at(-1);
  return (
    column && { date: column.date, offset: Math.max(0, edge - column.left) }
  );
}

export function restoreDayAnchor(
  columns: DayColumn[],
  anchor: DayAnchor | undefined,
  rail: number,
  max: number,
): number | undefined {
  const column = columns.find((item) => item.date === anchor?.date);
  return column && anchor
    ? clamp(
        column.left -
          rail +
          Math.min(anchor.offset, Math.max(0, column.width - 1)),
        max,
      )
    : undefined;
}

export function revealDay(
  column: DayColumn | undefined,
  scroll: number,
  viewport: number,
  rail: number,
  max: number,
  compact: boolean,
): number {
  if (!column) return clamp(scroll, max);
  if (compact || column.width > viewport - rail || column.left < scroll + rail)
    return clamp(column.left - rail, max);
  if (column.left + column.width > scroll + viewport)
    return clamp(column.left + column.width - viewport, max);
  return clamp(scroll, max);
}
