import { addDays } from './dates.ts';

type KeyInput = Pick<
  KeyboardEvent,
  | 'key'
  | 'altKey'
  | 'ctrlKey'
  | 'metaKey'
  | 'shiftKey'
  | 'isComposing'
  | 'repeat'
  | 'defaultPrevented'
>;

export function scheduleNavigation(
  event: KeyInput,
  scope: 'day' | 'week',
  day: string,
  week: string,
): { type: 'day' | 'week'; value: string } | undefined {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
    return;
  if (event.key === 'PageUp' || event.key === 'PageDown') {
    if (event.repeat) return;
    return {
      type: 'week',
      value: addDays(week, event.key === 'PageUp' ? -7 : 7),
    };
  }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    if (scope === 'week') {
      if (event.repeat) return;
      return { type: 'week', value: addDays(week, direction * 7) };
    }
    const value = addDays(day, direction);
    return {
      type: 'day',
      value: value < week || value > addDays(week, 6) ? day : value,
    };
  }
  if (scope === 'day' && ['Home', 'End'].includes(event.key))
    return {
      type: 'day',
      value: event.key === 'Home' ? week : addDays(week, 6),
    };
}
