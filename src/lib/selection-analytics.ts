import type { Selection, Subgroup } from './types.ts';
import { selectedSubgroup } from './subgroups.ts';

// Shared-link labels are arbitrary input. Only catalog-shaped group codes may
// enter analytics, along with the public source IDs requested by the owner.
export function selectionData(group: Selection, subgroups: Subgroup[] = []) {
  const code = /^[А-ЯЁA-Z0-9]{1,12}-\d{2,5}$/u.test(group.label)
    ? group.label
    : String(group.id);
  const selected = selectedSubgroup(group, subgroups);
  const subgroup = subgroups.find((s) => s.id === selected)?.label;
  return {
    group_id: group.id,
    group_label: code,
    subgroup_id: selected === -1 ? 'unresolved' : (selected ?? 'all'),
    ...(group.subgroupNumber ? { subgroup_number: group.subgroupNumber } : {}),
    subgroup_label:
      group.subgroup === undefined && group.subgroupNumber === undefined
        ? 'Вся группа'
        : subgroup && /^[А-ЯЁа-яёA-Za-z0-9 /-]{1,48}$/u.test(subgroup)
          ? subgroup
          : group.subgroupNumber
            ? `${code}/${group.subgroupNumber}`
            : String(group.subgroup),
  };
}
