import { useState, type ReactElement, type ReactNode } from 'react';
import { Button } from 'unlikely-ui/button';
import { Popover } from 'unlikely-ui/popover';
import Icon from '../../../shared/ui/Icon.tsx';

interface Props {
  label: string;
  trigger: ReactElement;
  children?: ReactNode;
  spotlight?: boolean;
  onSpotlight?: () => void;
  onManage?: () => void;
}

export default function ScheduleMenu({
  label,
  trigger,
  children,
  spotlight = false,
  onSpotlight,
  onManage,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger render={trigger} />
      <Popover.Content
        className="schedule-menu w-64 max-w-[calc(100vw-32px)] max-h-[min(480px,var(--available-height))] overflow-y-auto p-2"
        positionerProps={{ align: 'start' }}
      >
        <Popover.Title className="px-2 py-1 text-sm wrap-anywhere">
          {label}
        </Popover.Title>
        {children}
        <div
          className={children ? 'mt-1 border-t border-u-line-soft pt-1' : ''}
        >
          {onSpotlight && (
            <Button
              variant="ghost"
              className="schedule-menu-spotlight min-h-11 w-full justify-start text-sm [&>.u-button-label]:justify-start"
              aria-label={`Выделить ${label}`}
              aria-pressed={spotlight}
              onClick={onSpotlight}
            >
              <Icon name="focus" size={18} />
              {spotlight ? 'Снять подсветку' : 'Выделить расписание'}
            </Button>
          )}
          {onManage && (
            <Button
              variant="ghost"
              className="min-h-11 w-full justify-start text-sm [&>.u-button-label]:justify-start"
              onClick={() => {
                setOpen(false);
                // Let the popover return focus before the management dialog opens.
                requestAnimationFrame(onManage);
              }}
            >
              <Icon name="settings" size={18} />
              Управлять выбранными
            </Button>
          )}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
