import type { Interval } from '../../../lib/types.ts';
import { timeLabel } from '../../../lib/dates.ts';

export interface CalendarLayers {
  presence: boolean;
  free: boolean;
}

export default function ComparisonHighlights({
  result,
  layers,
  saved,
  start,
  scale,
  outside = false,
}: {
  result: { presence: Interval[]; free: Interval[] };
  layers: CalendarLayers;
  saved: boolean;
  outside?: boolean;
  start: number;
  scale: number;
}) {
  return (['presence', 'free'] as const).flatMap((layer) =>
    layers[layer]
      ? result[layer].map((range) => (
          <div
            key={`${layer}:${range.start}:${range.end}`}
            data-layer={layer}
            data-start={range.start}
            data-end={range.end}
            className={`shared-highlight pointer-events-none absolute z-[1] overflow-hidden motion-safe:animate-lesson-appear motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out ${layer === 'presence' ? `presence-highlight right-0 ${outside ? '-left-[10px]' : 'left-0'} border-y border-l-[5px] border-campus-presence-border bg-campus-presence/12` : `free-highlight right-px left-[7px] border-y border-u-accent-border ${saved ? 'bg-[color-mix(in_oklch,var(--u-accent-soft)_25%,transparent)]' : 'bg-[color-mix(in_oklch,var(--u-accent-soft)_70%,transparent)]'}`} ${saved ? 'saved-highlight border-dashed' : ''}`}
            aria-hidden="true"
            style={{
              top: (range.start - start) * scale,
              height: (range.end - range.start) * scale,
            }}
          >
            {layer === 'free' && (range.end - range.start) * scale >= 14 && (
              <span className="block truncate px-1 text-[9px] leading-3 text-u-selection-ink">
                {timeLabel(range.start)}–{timeLabel(range.end)}
              </span>
            )}
          </div>
        ))
      : [],
  );
}
