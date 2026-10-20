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
import '../../../components/controls.css';

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
    <div className="toolbar" inert={opening}>
      <div className="group-strip">
        {opening ? (
          <div className="group-placeholders" aria-hidden="true">
            <span className="skeleton group-placeholder" />
            <span className="skeleton group-placeholder" />
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
        <GroupPicker
          selected={view.groups}
          onAdd={view.add}
          onError={onError}
        />
      </div>
      <div className="view-controls">
        <div className="week-controls" data-schedule-week>
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
                  className="week-button"
                  aria-label={`Выбрать дату. ${weekLabel(view.week)}`}
                />
              }
            >
              <Icon name="calendar" />
              <span>
                {opening ? (
                  <span
                    className="skeleton week-label-placeholder"
                    aria-hidden="true"
                  />
                ) : (
                  weekLabel(view.week)
                )}
              </span>
              <Icon name="down" size={16} />
            </Popover.Trigger>
            <Popover.Content
              className="week-popover"
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
            className="mode-controls"
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
