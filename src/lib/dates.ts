export function omskToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Omsk',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T12:00:00Z`)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}

export function addDays(date: string, amount: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

export function monday(date: string): string {
  return addDays(date, -(new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7);
}

export function formatDay(
  date: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('ru-RU', {
    ...options,
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

export function weekLabel(week: string): string {
  const end = addDays(week, 6);
  return week.slice(0, 7) === end.slice(0, 7)
    ? `${Number(week.slice(8))}–${formatDay(end, { day: 'numeric', month: 'long' })}`
    : `${formatDay(week, { day: 'numeric', month: 'short' })} – ${formatDay(end, { day: 'numeric', month: 'short' })}`;
}

export function timeLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
