import { Button } from 'unlikely-ui/button';
import { Checkbox } from 'unlikely-ui/checkbox';
import { Popover } from 'unlikely-ui/popover';
import Icon from '../../../shared/ui/Icon.tsx';

interface Props {
  subgroupShades: boolean;
  onSubgroupShadesChange: (value: boolean) => void;
}

export default function ScheduleDisplayOptions({
  subgroupShades,
  onSubgroupShadesChange,
}: Props) {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="icon-button"
            aria-label="Вид расписания"
          />
        }
      >
        <Icon name="settings" />
      </Popover.Trigger>
      <Popover.Content
        className="display-options w-[min(320px,calc(100vw-24px))] p-3"
        positionerProps={{ align: 'end', sideOffset: 8 }}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <Popover.Title className="m-0 text-base">
            Вид расписания
          </Popover.Title>
          <Popover.Close
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Закрыть" />
            }
          >
            <Icon name="close" size={16} />
          </Popover.Close>
        </div>
        <Checkbox
          checked={subgroupShades}
          onCheckedChange={(value) => onSubgroupShadesChange(value === true)}
          className="min-h-11 w-full justify-start gap-2 text-left text-sm"
        >
          <span className="min-w-0">Различать подгруппы оттенками</span>
        </Checkbox>
        <Popover.Description className="mt-2 mb-0 text-xs leading-relaxed">
          Занятия всей группы сохраняют основной цвет.
        </Popover.Description>
      </Popover.Content>
    </Popover.Root>
  );
}
