import type { GroupSelection } from './types.ts';

// Shared-link labels are arbitrary input. Only catalog-shaped group codes may
// enter analytics. A boolean measures subgroup use without its number or ID.
export function selectionData(group: GroupSelection) {
  const code = /^[А-ЯЁA-Z0-9]{1,12}-\d{2,5}$/u.test(group.label)
    ? group.label
    : String(group.id);
  return {
    group_label: code,
    selected:
      group.subgroup !== undefined || group.subgroupNumber !== undefined,
  };
}
