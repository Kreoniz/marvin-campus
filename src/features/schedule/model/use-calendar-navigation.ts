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
  ready = true,
  focusedCard?: RefObject<HTMLElement | null>,
  orderedLanes = true,
) {
  const [viewportWidth, setViewportWidth] = useState(0);
  const previous = useRef<{
    key: string;
    columns: DayColumn[];
    rail: number;
    anchor?: DayAnchor;
    pendingReveal: boolean;
    left: number;
    orderedLanes: boolean;
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
      // Initial/date navigation can first measure narrow loading columns.
      // Consume its deferred reveal at the first published cohort, only once.
      const revealing = navigating || (old.pendingReveal && ready);
      let left = revealing
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
      const card = focusedCard?.current;
      if (
        !revealing &&
        old.orderedLanes !== orderedLanes &&
        card?.isConnected
      ) {
        // Preserve the keyed event when a presentation switch moves it inside
        // its date. Save the resulting date/offset for later resize callbacks.
        const box = card.getBoundingClientRect();
        const viewport = element!.getBoundingClientRect();
        const cardLeft = box.left - viewport.left + element!.scrollLeft;
        const cardRight = cardLeft + box.width;
        if (cardLeft < left + rail + 9) left = cardLeft - rail - 9;
        else if (cardRight > left + width - 9) left = cardRight - width + 9;
        left = Math.max(0, Math.min(left, max));
      }
      previous.current = {
        key,
        columns,
        rail,
        anchor: dayAnchor(columns, left, rail),
        pendingReveal: navigating ? !ready : old.pendingReveal && !ready,
        left,
        orderedLanes,
      };
      setViewportWidth(width);
      if (Math.abs(element!.scrollLeft - left) > 0.5)
        element!.scrollTo({
          left,
          behavior:
            revealing &&
            ready &&
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
      // While waiting, automatic navigation is instantaneous. A different
      // stable offset is a user-chosen anchor, not a deferred reveal request.
      if (Math.abs(element!.scrollLeft - old.left) > 0.5)
        old.pendingReveal = false;
    }
    function cancelPendingReveal() {
      if (previous.current) previous.current.pendingReveal = false;
    }
    function keyboard(event: KeyboardEvent) {
      if (
        [
          'ArrowLeft',
          'ArrowRight',
          'Home',
          'End',
          'PageUp',
          'PageDown',
          ' ',
        ].includes(event.key)
      )
        cancelPendingReveal();
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    bodies.forEach((body) => observer.observe(body));
    element.addEventListener('scroll', captureAnchor, { passive: true });
    element.addEventListener('wheel', cancelPendingReveal, { passive: true });
    element.addEventListener('pointerdown', cancelPendingReveal, {
      passive: true,
    });
    element.addEventListener('keydown', keyboard);
    update();
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', captureAnchor);
      element.removeEventListener('wheel', cancelPendingReveal);
      element.removeEventListener('pointerdown', cancelPendingReveal);
      element.removeEventListener('keydown', keyboard);
    };
  }, [
    ref,
    week,
    day,
    singleDay,
    compact,
    dayReveal,
    ready,
    focusedCard,
    orderedLanes,
  ]);
  return viewportWidth;
}
