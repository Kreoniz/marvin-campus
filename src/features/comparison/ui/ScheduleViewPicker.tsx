import { useId } from 'react';

export type ScheduleView = 'day' | 'week' | 'list';
const items = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'list', label: 'Список дня' },
] as const;

export default function ScheduleViewPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: ScheduleView;
  onChange: (value: ScheduleView) => void;
  disabled?: boolean;
}) {
  const name = useId();
  return (
    <div
      className="view-picker flex shrink-0"
      role="radiogroup"
      aria-label="Представление расписания"
    >
      {items.map((item) => (
        <label
          key={item.value}
          title={item.label}
          className={`relative flex h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center rounded-u-control border px-2 max-[359px]:px-0 has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-u-ink ${disabled ? 'cursor-default opacity-50' : ''} ${value === item.value ? 'border-u-selection-border bg-u-selection text-u-selection-ink forced-colors:border-[Highlight] forced-colors:text-[Highlight]' : 'border-transparent hover:bg-u-well forced-colors:border-transparent'}`}
        >
          <input
            className="sr-only"
            type="radio"
            name={name}
            value={item.value}
            aria-label={item.label}
            checked={value === item.value}
            disabled={disabled}
            onChange={() => onChange(item.value)}
          />
          <span className="text-xs font-medium">
            {item.value === 'week' ? (
              <>
                <span className="max-[359px]:hidden">Неделя</span>
                <span className="hidden max-[359px]:inline">Нед.</span>
              </>
            ) : item.value === 'list' ? (
              'Список'
            ) : (
              item.label
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
