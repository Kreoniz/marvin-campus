import { Select } from 'unlikely-ui/select';
import type { KeyboardEventHandler } from 'react';
import type { Subgroup } from '../../../lib/types.ts';
import { publicSubgroup } from '../../../lib/subgroups.ts';
import Icon from '../../../shared/ui/Icon.tsx';

interface Props {
  groupKey: string;
  label: string;
  subgroups: Subgroup[];
  value?: number;
  subgroupNumber?: number;
  describedBy?: string;
  cardsHidden?: boolean;
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
  onChange: (value?: number) => void;
}

export default function SubgroupPicker({
  groupKey,
  label,
  subgroups,
  value,
  subgroupNumber,
  describedBy,
  cardsHidden = false,
  onKeyDown,
  onChange,
}: Props) {
  const current = subgroups.find((subgroup) => subgroup.id === value);
  const number = subgroupNumber ?? (current && publicSubgroup(current.label));
  const currentLabel = value
    ? (current?.label ??
      (number ? `${label}/${number}` : 'Выбранная подгруппа'))
    : number
      ? `${label}/${number}`
      : 'Вся группа';
  const items = [
    { value: 'all', label: 'Вся группа' },
    ...(!value && subgroupNumber
      ? [{ value: 'pending', label: currentLabel }]
      : []),
    ...(value && !current
      ? [{ value: String(value), label: currentLabel }]
      : []),
    ...subgroups.map((subgroup) => ({
      value: String(subgroup.id),
      label: subgroup.label,
    })),
  ];
  const selected = value ? String(value) : subgroupNumber ? 'pending' : 'all';
  return (
    <Select.Root
      items={items}
      value={selected}
      onValueChange={(next) => {
        if (next !== null && next !== 'pending')
          onChange(next === 'all' ? undefined : Number(next));
      }}
    >
      <Select.Trigger
        className="subgroup-trigger relative h-11 min-h-11 min-w-16 flex-1 gap-0 rounded-none border-0 bg-transparent px-1 text-inherit shadow-none [&_.u-select-icon]:hidden"
        aria-label={`Подгруппа ${label}: ${currentLabel}`}
        data-drag-id={groupKey}
        aria-describedby={describedBy}
        onKeyDown={onKeyDown}
        title={currentLabel}
      >
        <span className="flex w-full min-w-0 flex-col items-center gap-0.5 leading-[1.2]">
          <strong className="max-w-full truncate text-[13px]">{label}</strong>
          <span className="subgroup-caption inline-flex shrink-0 items-center gap-0.5 text-[11px] whitespace-nowrap">
            {number ? `Подгр. ${number}` : value ? 'Подгр.' : 'Все'}
            <Icon name="down" size={10} />
            {cardsHidden && (
              <span title="Карточки этого вида скрыты">
                <Icon name="hidden" size={11} />
              </span>
            )}
          </span>
        </span>
      </Select.Trigger>
      <Select.Content className="min-w-48 max-w-[calc(100vw-32px)]">
        {items.map((item) => (
          <Select.Item
            key={item.value}
            value={item.value}
            disabled={item.value === 'pending'}
            className="min-h-11 min-w-0 text-sm wrap-anywhere [&>div]:min-w-0"
          >
            {item.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}
