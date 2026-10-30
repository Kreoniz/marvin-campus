import { useHotkeys } from '@tanstack/react-hotkeys';
import { addDays, omskToday } from '../../../lib/dates.ts';
import type { ComparisonView } from './use-comparison.ts';
import type { ScheduleView } from '../ui/ScheduleViewPicker.tsx';

// Physical keys keep Vim positions usable with a Russian keyboard layout.
export default function useScheduleHotkeys({
  view,
  enabled,
  onSearch,
  onView,
}: {
  view: ComparisonView;
  enabled: boolean;
  onSearch: () => void;
  onView: (value: ScheduleView) => void;
}) {
  function run(action: () => void, repeat = false) {
    return (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        (!repeat && event.repeat)
      )
        return;
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
        )
      )
        return;
      const popup = [
        ...document.querySelectorAll<HTMLElement>(
          '.u-dialog, .u-popover, [role="listbox"], [role="menu"]',
        ),
      ].some(
        (element) =>
          element.getClientRects().length > 0 &&
          !element.closest('[hidden], [inert], [aria-hidden="true"]'),
      );
      if (popup) return;
      event.preventDefault();
      action();
    };
  }
  function scroll(direction: number, edge = false) {
    const viewport = [
      ...document.querySelectorAll<HTMLElement>(
        '#comparison .week-scroll, #comparison .source-scroll',
      ),
    ].find((element) => element.scrollHeight > element.clientHeight + 1);
    const options = {
      top: edge
        ? direction < 0
          ? 0
          : (viewport?.scrollHeight ?? document.documentElement.scrollHeight)
        : direction * 160,
      behavior: 'instant' as const,
    };
    if (edge) (viewport ?? window).scrollTo(options);
    else (viewport ?? window).scrollBy(options);
  }
  useHotkeys(
    [
      {
        hotkey: '[KeyH]',
        callback: run(() => view.selectDate(addDays(view.day, -1))),
      },
      {
        hotkey: '[KeyL]',
        callback: run(() => view.selectDate(addDays(view.day, 1))),
      },
      {
        hotkey: 'Shift+[KeyH]',
        callback: run(() => view.selectDate(addDays(view.day, -7))),
      },
      {
        hotkey: 'Shift+[KeyL]',
        callback: run(() => view.selectDate(addDays(view.day, 7))),
      },
      { hotkey: '[KeyJ]', callback: run(() => scroll(1), true) },
      { hotkey: '[KeyK]', callback: run(() => scroll(-1), true) },
      {
        hotkey: ['[KeyG]', '[KeyG]'],
        callback: run(() => scroll(-1, true)),
        options: { timeout: 500 },
      },
      { hotkey: 'Shift+[KeyG]', callback: run(() => scroll(1, true)) },
      { hotkey: '[KeyT]', callback: run(() => view.selectDate(omskToday())) },
      { hotkey: '[Slash]', callback: run(onSearch) },
      { hotkey: '[Digit1]', callback: run(() => onView('day')) },
      { hotkey: '[Digit2]', callback: run(() => onView('week')) },
      { hotkey: '[Digit3]', callback: run(() => onView('list')) },
      {
        hotkey: 'Shift+[Slash]',
        callback: run(() =>
          document
            .querySelector<HTMLButtonElement>(
              '[aria-label="Как работает сравнение"]',
            )
            ?.click(),
        ),
      },
    ],
    {
      enabled,
      ignoreInputs: true,
      preventDefault: false,
      stopPropagation: false,
    },
  );
}
