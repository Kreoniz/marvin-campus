import type { Selection } from '../../../lib/types.ts';
import {
  compareScheduleRefs,
  selectionKind,
} from '../../../lib/schedule-ref.ts';

// A presentation owner, independent of user order, color, and spotlight.
// Do not change the canonical ordering of members in the domain projection.
export function eventOwner(members: Selection[]): Selection | undefined {
  const rank = (member: Selection) => {
    const kind = selectionKind(member);
    return kind === 'group' || kind === 'vuc' ? 0 : kind === 'lecturer' ? 1 : 2;
  };
  return [...members].sort(
    (a, b) => rank(a) - rank(b) || compareScheduleRefs(a, b),
  )[0];
}
