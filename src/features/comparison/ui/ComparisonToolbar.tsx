import { useState } from 'react';
import { Button } from 'unlikely-ui/button';
import { Popover } from 'unlikely-ui/popover';
import { RadioGroup } from 'unlikely-ui/radio-group';
import type { ComparisonView } from '../model/use-comparison.ts';
import type { GroupSchedule, Mode, Subgroup } from '../../../lib/types.ts';
import type { GroupColors } from '../../../lib/colors.ts';
import { addDays, weekLabel } from '../../../lib/dates.ts';
import GroupStrip from '../../groups/ui/GroupStrip.tsx';
import GroupPicker from '../../groups/ui/GroupPicker.tsx';
import IconButton from '../../../shared/ui/IconButton.tsx';
import Icon from '../../../shared/ui/Icon.tsx';
import DatePicker from './LazyDatePicker.tsx';

interface Props {
  view: ComparisonView;
  schedules: GroupSchedule[];
  subgroupCatalog: Record<number, Subgroup[]>;
  colors: GroupColors;
  opening: boolean;
  onOrder: (id: number) => void;
  onError: (message: string) => void;
}
export default function ComparisonToolbar({
  view,
  schedules,
  subgroupCatalog,
  colors,
  opening,
  onOrder,
  onError,
}: Props) {
  const [weekOpen, setWeekOpen] = useState(false);
  function selectDate(value: string) {
    view.selectDate(value);
    setWeekOpen(false);
  }
  return (
    <div
      className="toolbar flex flex-wrap items-center justify-between gap-[15px] border-b border-[var(--u-line-soft)] p-3.5 min-[1100px]:flex-nowrap max-[1100px]:gap-3 compact:gap-0 compact:px-2 compact:py-1"
      inert={opening}
    >
      <div className="group-strip flex min-w-0 flex-[1_1_320px] items-center gap-1 min-[1100px]:flex-1 compact:w-full compact:basis-full [--group-scrollbar-size:var(--u-space-3)] pointer-coarse:[--group-scrollbar-size:var(--u-space-6)] compact:[&_.add-group]:size-11 compact:[&_.add-group]:min-h-11 compact:[&_.add-group]:min-w-11 compact:[&_.add-group]:p-0 compact:[&_.add-group-label]:hidden">
        {opening ? (
          <div
            className="flex h-[77px] w-[249px] flex-[0_1_auto] items-center gap-[9px] overflow-hidden p-1 pb-[var(--group-scrollbar-size)] compact:h-[calc(3.25rem+var(--group-scrollbar-size))] compact:w-[220px] compact:pb-[calc(var(--group-scrollbar-size)+0.25rem)]"
            aria-hidden="true"
          >
            <span className="h-[57px] w-[116px] shrink-0 animate-pulse rounded-u-control bg-[var(--u-well)] motion-reduce:animate-none compact:h-11 compact:w-[104px]" />
            <span className="h-[57px] w-[116px] shrink-0 animate-pulse rounded-u-control bg-[var(--u-well)] motion-reduce:animate-none compact:h-11 compact:w-[104px]" />
          </div>
        ) : (
          <GroupStrip
            groups={view.groups}
            schedules={schedules}
            subgroupCatalog={subgroupCatalog}
            colors={colors}
            onRemove={view.remove}
            onSubgroup={view.subgroup}
            onReorder={view.reorder}
            onOrder={onOrder}
          />
        )}
        <div className="flex shrink-0 items-center pb-[calc(var(--group-scrollbar-size)-0.25rem)] compact:pb-[var(--group-scrollbar-size)]">
          <GroupPicker
            selected={view.groups}
            onAdd={view.add}
            onError={onError}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-[11px] min-[1100px]:shrink-0 max-[1100px]:w-full max-[1100px]:justify-between compact:hidden">
        <div className="flex items-center gap-px" data-schedule-week>
          <IconButton
            label="Предыдущая неделя"
            name="left"
            onClick={() => view.selectWeek(addDays(view.week, -7))}
          />
          <Popover.Root open={weekOpen} onOpenChange={setWeekOpen}>
            <Popover.Trigger
              render={
                <Button
                  variant="secondary"
                  className="week-button w-[218px] [&>.u-button-label]:grid [&>.u-button-label]:w-full [&>.u-button-label]:min-w-0 [&>.u-button-label]:grid-cols-[20px_minmax(0,1fr)_16px] [&>.u-button-label]:gap-2.5 [&>.u-button-label>span]:min-w-0 [&>.u-button-label>span]:truncate"
                  aria-label={`Выбрать дату. ${weekLabel(view.week)}`}
                />
              }
            >
              <Icon name="calendar" />
              <span>
                {opening ? (
                  <span
                    className="inline-block h-3.5 w-32 animate-pulse rounded-u-control bg-[var(--u-well)] align-middle motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                ) : (
                  weekLabel(view.week)
                )}
              </span>
              <Icon name="down" size={16} />
            </Popover.Trigger>
            <Popover.Content
              aria-label="Выбор даты расписания"
              className="week-popover w-[min(340px,calc(100vw-24px))] p-3"
              positionerProps={{ sideOffset: 8 }}
            >
              <DatePicker day={view.day} onSelect={selectDate} />
            </Popover.Content>
          </Popover.Root>
          <IconButton
            label="Следующая неделя"
            name="right"
            onClick={() => view.selectWeek(addDays(view.week, 7))}
          />
        </div>
        {view.groups.length >= 2 && (
          <RadioGroup.Root
            className="mode-controls w-[260px] max-w-full [&_.u-segmented-item]:flex-1 [&_.u-segmented-item]:whitespace-nowrap [&_.u-segmented-item]:text-xs"
            variant="segmented"
            aria-label="Режим сравнения"
            value={view.mode}
            onValueChange={(value) => view.selectMode(value as Mode)}
          >
            <RadioGroup.Item value="presence">В вузе</RadioGroup.Item>
            <RadioGroup.Item value="free">Без занятий</RadioGroup.Item>
          </RadioGroup.Root>
        )}
      </div>
    </div>
  );
}
