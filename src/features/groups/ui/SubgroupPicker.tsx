import { RadioGroup } from 'unlikely-ui/radio-group';
import type { KeyboardEventHandler } from 'react';
import type { Subgroup } from '../../../lib/types.ts';
import { publicSubgroup } from '../../../lib/subgroups.ts';
import Icon from '../../../shared/ui/Icon.tsx';
import ScheduleMenu from './ScheduleMenu.tsx';

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
  spotlight?: boolean;
  onSpotlight?: () => void;
  onManage?: () => void;
  onRemove?: () => void;
  onClearSpotlights?: () => void;
  hasSpotlights?: boolean;
  color?: string;
  status?: string;
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
  spotlight,
  onSpotlight,
  onManage,
  onRemove,
  onClearSpotlights,
  hasSpotlights,
  color,
  status,
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
    <ScheduleMenu
      label={label}
      spotlight={spotlight}
      onSpotlight={onSpotlight}
      onManage={onManage}
      onRemove={onRemove}
      onClearSpotlights={onClearSpotlights}
      hasSpotlights={hasSpotlights}
      color={color}
      status={status}
      trigger={
        <button
          type="button"
          className="subgroup-trigger relative flex h-11 min-h-11 min-w-16 flex-1 cursor-pointer items-center rounded-[inherit] border-0 bg-transparent px-2 text-inherit focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-current"
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
        </button>
      }
    >
      <RadioGroup.Root
        variant="segmented"
        className="w-full flex-col gap-0 border-0 bg-transparent p-0"
        aria-label={`Подгруппа ${label}`}
        value={selected}
        onValueChange={(next) => {
          if (next !== 'pending')
            onChange(next === 'all' ? undefined : Number(next));
        }}
      >
        {items.map((item) => (
          <RadioGroup.Item
            key={item.value}
            value={item.value}
            disabled={item.value === 'pending'}
            className="min-h-11 w-full min-w-0 justify-start px-2 text-sm wrap-anywhere"
          >
            {item.label}
          </RadioGroup.Item>
        ))}
      </RadioGroup.Root>
    </ScheduleMenu>
  );
}
