import { useRef, useState } from 'react';
import { Button } from 'unlikely-ui/button';
import { Dialog } from 'unlikely-ui/dialog';
import IconButton from '../../../shared/ui/IconButton.tsx';
import Icon from '../../../shared/ui/Icon.tsx';
import HelpDialog from '../../../app/ui/HelpDialog.tsx';
import type { CalendarLayers } from '../../schedule/ui/ComparisonHighlights.tsx';

export default function DisplaySettings({
  layers,
  onLayers,
  theme,
  onToggleTheme,
  spotlightLabel,
  onClearSpotlight,
}: {
  layers: CalendarLayers;
  onLayers: (layers: CalendarLayers) => void;
  theme: string;
  onToggleTheme: () => void;
  spotlightLabel?: string;
  onClearSpotlight: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          render={
            <IconButton
              ref={trigger}
              name="settings"
              label="Отображение"
              className="size-11 min-h-11 min-w-11 shrink-0"
            />
          }
        />
        <Dialog.Content className="w-[min(380px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Dialog.Title className="m-0 text-lg">Отображение</Dialog.Title>
            <Dialog.Close
              render={
                <IconButton
                  name="close"
                  label="Закрыть настройки"
                  className="size-11 min-h-11 min-w-11"
                />
              }
            />
          </div>
          <Dialog.Description className="sr-only">
            Слои календаря, тема и подсветка групп.
          </Dialog.Description>
          <fieldset className="m-0 border-0 p-0">
            <legend className="text-xs font-semibold text-u-muted">
              Слои календаря
            </legend>
            {(['presence', 'free'] as const).map((layer) => (
              <label
                key={layer}
                className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-u-selection-ink"
                  checked={layers[layer]}
                  onChange={(event) =>
                    onLayers({ ...layers, [layer]: event.target.checked })
                  }
                />
                <span
                  aria-hidden="true"
                  className={`h-3 w-3 border-l-[3px] ${layer === 'presence' ? 'border-campus-presence-border' : 'border-y border-u-accent-border bg-u-accent-soft'}`}
                />
                {layer === 'presence'
                  ? 'Общее время в вузе'
                  : 'Общие окна без занятий'}
              </label>
            ))}
          </fieldset>
          <div className="mt-2 border-t border-u-line-soft pt-2">
            <Button
              variant="ghost"
              className="min-h-11 w-full justify-start text-sm [&>.u-button-label]:justify-start"
              onClick={onToggleTheme}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
              {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
            </Button>
            {spotlightLabel && (
              <Button
                variant="ghost"
                className="min-h-11 w-full justify-start text-sm [&>.u-button-label]:justify-start"
                onClick={onClearSpotlight}
                aria-label={`Снять подсветку ${spotlightLabel}`}
              >
                <Icon name="focus" size={18} />
                Снять подсветку
              </Button>
            )}
            <Button
              variant="ghost"
              className="min-h-11 w-full justify-start text-sm [&>.u-button-label]:justify-start"
              onClick={() => {
                setOpen(false);
                setHelpOpen(true);
              }}
            >
              <Icon name="info" size={18} />
              Как пользоваться
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Root>
      <HelpDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        hideTrigger
        returnFocus={() => trigger.current ?? true}
      />
    </>
  );
}
