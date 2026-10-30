import {
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
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
  onRemove?: () => void;
  onClearSpotlights?: () => void;
  hasSpotlights?: boolean;
  color?: string;
  resourceKind?: 'lecturer' | 'auditorium';
  status?: string;
}

export default function ScheduleMenu({
  label,
  trigger,
  children,
  spotlight = false,
  onSpotlight,
  onManage,
  onRemove,
  onClearSpotlights,
  hasSpotlights = false,
  color,
  resourceKind,
  status,
}: Props) {
  const [open, setOpen] = useState(false);
  const removing = useRef(false);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (next) removing.current = false;
        setOpen(next);
      }}
    >
      <Popover.Trigger render={trigger} />
      <Popover.Content
        className="schedule-menu w-64 max-w-[calc(100vw-32px)] max-h-[min(480px,var(--available-height))] overflow-y-auto p-2"
        positionerProps={{ align: 'start' }}
        style={{ '--chip': color } as CSSProperties}
        finalFocus={() => !removing.current}
      >
        <Popover.Title className="px-2 py-1 text-sm wrap-anywhere">
          {label}
        </Popover.Title>
        {status && (
          <p className="mx-2 my-1 text-xs leading-relaxed text-u-muted">
            {status}
          </p>
        )}
        {children}
        <div
          className={children ? 'mt-1 border-t border-u-line-soft pt-1' : ''}
        >
          {onSpotlight && (
            <Button
              variant="ghost"
              className={`schedule-menu-spotlight min-h-11 w-full justify-start text-sm [&>.u-button-label]:justify-start ${spotlight && resourceKind ? `resource-card resource-${resourceKind}` : ''}`}
              aria-label={`Выделить ${label}`}
              aria-pressed={spotlight}
              onClick={onSpotlight}
            >
              <Icon name="focus" size={18} />
              {spotlight ? 'Снять подсветку' : 'Выделить расписание'}
            </Button>
          )}
          {onClearSpotlights && (
            <Button
              variant="ghost"
              className="min-h-11 w-full justify-start text-sm [&>.u-button-label]:justify-start"
              disabled={!hasSpotlights}
              onClick={() => {
                onClearSpotlights();
                setOpen(false);
              }}
            >
              <Icon name="clear-focus" size={18} />
              Снять все выделения
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
          {onRemove && (
            <Button
              variant="ghost"
              className="min-h-11 w-full justify-start text-sm [&>.u-button-label]:justify-start"
              onClick={() => {
                removing.current = true;
                setOpen(false);
                // GroupStrip owns the surviving trigger/search focus.
                onRemove();
              }}
            >
              <Icon name="close" size={18} />
              Убрать расписание
            </Button>
          )}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
