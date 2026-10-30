import type { Lesson } from '../../../lib/types.ts';

// These are source labels, not canonical group IDs. Never make links from them.
// Keep the exact audience in details; only the card's reading line is shortened.
export function compactAudience(events: Lesson[]): string {
  const labels = [
    ...new Set(
      events.flatMap((event) =>
        (event.audiences?.length ? event.audiences : [event.audience ?? ''])
          .flatMap((text) =>
            text
              .trim()
              .replace(/Поток\s*\(([^()]*)\)/giu, '$1')
              .split(/[,;\n]+/u),
          )
          .map((text) => text.trim())
          .filter(Boolean),
      ),
    ),
  ];
  return labels.length
    ? `${labels[0]}${labels.length > 1 ? ` +${labels.length - 1}` : ''}`
    : '';
}
