import type { LessonBlock } from '../../../lib/lesson-layout.ts';
import type { Selection } from '../../../lib/types.ts';
import { scheduleKey, selectionKind } from '../../../lib/schedule-ref.ts';
import { eventOwner } from './event-owner.ts';
import {
  verticalLayout,
  VERTICAL_CARD_WIDTH,
  VERTICAL_LANE_PITCH,
  type VerticalPlacement,
} from './vertical-layout.ts';

export const SOURCE_GAP = 12;
export const SOURCE_INSET = 6;
export interface SourceOccurrence extends VerticalPlacement {
  member: Selection;
  reference: boolean;
}
export interface SourceTrack {
  key: string;
  selection: Selection;
  left: number;
  width: number;
  occurrences: SourceOccurrence[];
}
// References reuse a canonical block; they never enter lesson counts or calculations.
export function sourceTracks(
  blocks: LessonBlock[],
  selections: Selection[],
  origin: number,
  scale: number,
): SourceTrack[] {
  const visible = new Set(selections.map(scheduleKey));
  const owners = new Map(
    blocks.map((block) => [
      block.identity,
      eventOwner(
        block.members.filter((member) => visible.has(scheduleKey(member))),
      ),
    ]),
  );
  let left = SOURCE_INSET;
  return selections.map((selection, index) => {
    if (index)
      left +=
        SOURCE_GAP +
        (selectionKind(selections[index - 1]) !== selectionKind(selection)
          ? SOURCE_GAP
          : 0);
    const key = scheduleKey(selection);
    const placed = verticalLayout(
      blocks.filter((block) =>
        block.members.some((member) => scheduleKey(member) === key),
      ),
      origin,
      scale,
    );
    const lanes = Math.max(1, ...placed.map((entry) => entry.columns));
    const width =
      VERTICAL_CARD_WIDTH * lanes +
      (lanes - 1) * (VERTICAL_LANE_PITCH - VERTICAL_CARD_WIDTH);
    const track = {
      key,
      selection,
      left,
      width,
      occurrences: placed.map((entry) => ({
        ...entry,
        member: selection,
        reference: scheduleKey(owners.get(entry.block.identity)!) !== key,
      })),
    };
    left += width;
    return track;
  });
}

export function sourceAnchor(
  tracks: Pick<SourceTrack, 'key' | 'left' | 'width'>[],
  offset: number,
) {
  const track =
    tracks.find((track) => track.left + track.width > offset) ?? tracks.at(-1);
  return track ? { key: track.key, offset: offset - track.left } : undefined;
}

// A source can lose overlap lanes or disappear after a filter/date update.
// Keep a complete lane in view and fall back by the prior source order.
export function restoreSourceAnchor(
  anchor: ReturnType<typeof sourceAnchor>,
  previous: Pick<SourceTrack, 'key' | 'left' | 'width'>[],
  tracks: Pick<SourceTrack, 'key' | 'left' | 'width'>[],
): number | undefined {
  if (!anchor || !tracks.length) return undefined;
  let target = tracks.find((track) => track.key === anchor.key);
  let offset = anchor.offset;
  if (!target) {
    const index = previous.findIndex((track) => track.key === anchor.key);
    const neighbors = [
      ...previous.slice(index + 1),
      ...previous.slice(0, index).reverse(),
    ];
    target =
      neighbors
        .map((prior) => tracks.find((track) => track.key === prior.key))
        .find(Boolean) ?? tracks[0];
    offset = -SOURCE_INSET;
  }
  const max = Math.max(
    -SOURCE_INSET,
    target.width - VERTICAL_CARD_WIDTH - SOURCE_INSET,
  );
  return Math.max(
    0,
    target.left + Math.max(-SOURCE_INSET, Math.min(offset, max)),
  );
}
