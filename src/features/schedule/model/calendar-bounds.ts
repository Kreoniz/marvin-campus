import type { Interval } from '../../../lib/types.ts';

// Display defaults only. Original intervals and calculation inputs stay intact.
export function calendarBounds(lessons: Interval[], vucOnly = false) {
  const start = Math.min(
    vucOnly ? 540 : 480,
    ...lessons.map((lesson) => Math.floor(lesson.start / 60) * 60),
  );
  const end =
    vucOnly && lessons.length
      ? Math.max(
          start + 60,
          ...lessons.map((lesson) => Math.ceil(lesson.end / 60) * 60),
        )
      : Math.max(
          vucOnly ? 1080 : 1140,
          ...lessons.map((lesson) => Math.ceil(lesson.end / 60) * 60),
        );
  return { start, end };
}
