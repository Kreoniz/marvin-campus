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
  end,
}: {
  result: { presence: Interval[]; free: Interval[] };
  layers: CalendarLayers;
  saved: boolean;
} & (
  | { start: number; scale: number; end?: undefined }
  | { start: number; end: number; scale?: undefined }
)) {
  const horizontal = end !== undefined;
  return (['presence', 'free'] as const).flatMap((layer) =>
    layers[layer]
      ? result[layer].map((range) => (
          <div
            key={`${layer}:${range.start}:${range.end}`}
            data-layer={layer}
            data-start={range.start}
            data-end={range.end}
            className={`shared-highlight pointer-events-none absolute z-[1] overflow-hidden motion-safe:animate-lesson-appear motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out ${layer === 'presence' ? `presence-highlight border-campus-presence-border bg-campus-presence/12 ${horizontal ? 'top-[29px] bottom-1 border-x border-t-[5px]' : 'right-px left-px border-y border-l-[5px]'}` : `free-highlight border-u-accent-border ${horizontal ? 'top-[36px] bottom-1 border-y' : 'right-px left-[7px] border-y'} ${saved ? 'bg-[color-mix(in_oklch,var(--u-accent-soft)_25%,transparent)]' : 'bg-[color-mix(in_oklch,var(--u-accent-soft)_70%,transparent)]'}`} ${saved ? 'saved-highlight border-dashed' : ''}`}
            aria-hidden="true"
            style={
              horizontal
                ? {
                    left: `${((range.start - start) * 100) / (end - start)}%`,
                    width: `${((range.end - range.start) * 100) / (end - start)}%`,
                  }
                : {
                    top: (range.start - start) * scale,
                    height: (range.end - range.start) * scale,
                  }
            }
          >
            {layer === 'free' && (
              <span className="block truncate px-1 text-[9px] leading-3 text-u-selection-ink">
                {timeLabel(range.start)}–{timeLabel(range.end)}
              </span>
            )}
          </div>
        ))
      : [],
  );
}
