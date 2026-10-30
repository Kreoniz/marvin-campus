import type { LessonBlock } from '../../../lib/lesson-layout.ts';
import type { Selection } from '../../../lib/types.ts';
import { scheduleKey, selectionKind } from '../../../lib/schedule-ref.ts';
import { verticalLayout, type VerticalPlacement } from './vertical-layout.ts';

export const SOURCE_GAP = 16;
export const SOURCE_INSET = 9;
const LANE_GAP = 6;

// Density is presentation-only. Keep readable cards and scroll the canvas;
// never compress thirty sources into thin strips or change their time scale.
export function sourceCardWidth(count: number) {
  return count <= 3 ? 160 : count <= 6 ? 144 : count <= 12 ? 128 : 112;
}
export interface SourceOccurrence extends VerticalPlacement {
  member: Selection;
  reference: boolean;
}
export interface SourceTrack {
  key: string;
  selection: Selection;
  left: number;
  width: number;
  cardWidth: number;
  lanePitch: number;
  occurrences: SourceOccurrence[];
}
// References reuse a canonical block; they never enter lesson counts or calculations.
export function sourceTracks(
  blocks: LessonBlock[],
  selections: Selection[],
  origin: number,
  scale: number,
): SourceTrack[] {
  const owners = new Map(
    blocks.map((block) => [
      block.identity,
      selections.find((selection) =>
        block.members.some(
          (member) => scheduleKey(member) === scheduleKey(selection),
        ),
      ),
    ]),
  );
  const cardWidth = sourceCardWidth(selections.length);
  const lanePitch = cardWidth + LANE_GAP;
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
    const width = cardWidth * lanes + (lanes - 1) * LANE_GAP;
    const track = {
      key,
      selection,
      left,
      width,
      cardWidth,
      lanePitch,
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

// Week omits confirmed-empty bands. Missing/ambiguous sources are reported by
// the day's status, independently of this projection of known occurrences.
export function activeSourceTracks(
  blocks: LessonBlock[],
  selections: Selection[],
  origin: number,
  scale: number,
) {
  const active = new Set(
    blocks.flatMap((block) => block.members.map(scheduleKey)),
  );
  return sourceTracks(
    blocks,
    selections.filter((selection) => active.has(scheduleKey(selection))),
    origin,
    scale,
  );
}

export function sourceTracksWidth(tracks: SourceTrack[]) {
  const last = tracks.at(-1);
  return last
    ? last.left + last.width + SOURCE_INSET
    : sourceCardWidth(0) + 2 * SOURCE_INSET;
}

export function sourceAnchor(
  tracks: (Pick<SourceTrack, 'key' | 'left' | 'width'> & {
    cardWidth?: number;
  })[],
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
  tracks: (Pick<SourceTrack, 'key' | 'left' | 'width'> & {
    cardWidth?: number;
  })[],
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
    target.width - (target.cardWidth ?? sourceCardWidth(0)) - SOURCE_INSET,
  );
  return Math.max(
    0,
    target.left + Math.max(-SOURCE_INSET, Math.min(offset, max)),
  );
}
