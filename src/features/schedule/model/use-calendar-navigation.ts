import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import {
  dayAnchor,
  restoreDayAnchor,
  revealDay,
  type DayAnchor,
  type DayColumn,
} from './calendar-navigation.ts';

export default function useCalendarNavigation(
  ref: RefObject<HTMLDivElement | null>,
  week: string,
  day: string,
  singleDay: boolean,
  compact: boolean,
  dayReveal = 0,
) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const previous = useRef<{
    key: string;
    columns: DayColumn[];
    rail: number;
    anchor?: DayAnchor;
  }>(undefined);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const key = `${week}:${day}:${singleDay}:${compact}:${dayReveal}`;
    const bodies = Array.from(
      element.querySelectorAll<HTMLElement>('[data-calendar-date]'),
    );
    const railElement = element.querySelector<HTMLElement>('.time-rail');
    function measure() {
      const viewport = element!.getBoundingClientRect();
      return bodies.map((body) => {
        const bounds = body.getBoundingClientRect();
        return {
          date: body.dataset.calendarDate!,
          left:
            bounds.left -
            viewport.left -
            element!.clientLeft +
            element!.scrollLeft,
          width: bounds.width,
        };
      });
    }
    function update() {
      const columns = measure();
      const rail = railElement?.getBoundingClientRect().width ?? 0;
      const width = element!.clientWidth;
      const max = Math.max(0, element!.scrollWidth - width);
      const old = previous.current;
      const navigating = old?.key !== key;
      const left = navigating
        ? singleDay
          ? 0
          : revealDay(
              columns.find((c) => c.date === day),
              element!.scrollLeft,
              width,
              rail,
              max,
              compact,
            )
        : (restoreDayAnchor(columns, old.anchor, rail, max) ??
          element!.scrollLeft);
      previous.current = {
        key,
        columns,
        rail,
        anchor: dayAnchor(columns, left, rail),
      };
      setViewportWidth(width);
      if (Math.abs(element!.scrollLeft - left) > 0.5)
        element!.scrollTo({
          left,
          behavior:
            navigating &&
            old &&
            !matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'smooth'
              : 'auto',
        });
    }
    function captureAnchor() {
      const old = previous.current;
      if (!old) return;
      const measured = measure();
      // A browser clamp during reflow must not overwrite the pre-refresh anchor.
      if (
        measured.some(
          (column, i) =>
            column.date !== old.columns[i]?.date ||
            Math.abs(column.width - old.columns[i].width) > 0.5,
        )
      )
        return;
      old.anchor = dayAnchor(old.columns, element!.scrollLeft, old.rail);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    bodies.forEach((body) => observer.observe(body));
    element.addEventListener('scroll', captureAnchor, { passive: true });
    update();
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', captureAnchor);
    };
  }, [ref, week, day, singleDay, compact, dayReveal]);
  return viewportWidth;
}
