import { Select } from 'unlikely-ui/select';
import type { Subgroup } from '../../../lib/types.ts';

interface Props {
  label: string;
  subgroups: Subgroup[];
  value?: number;
  subgroupNumber?: number;
  onChange: (value?: number) => void;
}

export default function SubgroupPicker({
  label,
  subgroups,
  value,
  subgroupNumber,
  onChange,
}: Props) {
  const currentLabel = value
    ? (subgroups.find((s) => s.id === value)?.label ??
      (subgroupNumber ? `${label}/${subgroupNumber}` : 'Выбранная подгруппа'))
    : subgroupNumber
      ? `${label}/${subgroupNumber}`
      : 'Вся группа';
  const items = [
    { value: 'all', label: 'Вся группа' },
    ...(!value && subgroupNumber
      ? [{ value: 'pending', label: currentLabel }]
      : []),
    ...(value && !subgroups.some((item) => item.id === value)
      ? [{ value: String(value), label: currentLabel }]
      : []),
    ...subgroups.map((s) => ({ value: String(s.id), label: s.label })),
  ];
  return (
    <Select.Root
      items={items}
      value={value ? String(value) : subgroupNumber ? 'pending' : 'all'}
      onValueChange={(next) => {
        if (next !== null && next !== 'pending')
          onChange(next === 'all' ? undefined : Number(next));
      }}
    >
      <Select.Trigger
        className="subgroup-trigger"
        size="sm"
        aria-label={`Подгруппа ${label}: ${currentLabel}`}
      >
        <Select.Value />
      </Select.Trigger>
      <Select.Content className="campus-subgroup-options">
        {items.map((item) => (
          <Select.Item
            key={item.value}
            value={item.value}
            disabled={item.value === 'pending'}
          >
            {item.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
