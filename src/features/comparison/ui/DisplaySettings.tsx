import { useState } from 'react';
import { Button } from 'unlikely-ui/button';
import { Dialog } from 'unlikely-ui/dialog';
import IconButton from '../../../shared/ui/IconButton.tsx';
import Icon from '../../../shared/ui/Icon.tsx';
import type { CalendarLayers } from '../../schedule/ui/ComparisonHighlights.tsx';
import type { ScheduleKind } from '../../../lib/types.ts';

const kinds = [
  { kind: 'group', label: 'Группы', icon: 'groups' },
  { kind: 'lecturer', label: 'Преподаватели', icon: 'teacher' },
  { kind: 'auditorium', label: 'Аудитории', icon: 'room' },
  { kind: 'vuc', label: 'ВУЦ', icon: 'vuc' },
] as const;

export default function DisplaySettings({
  orderedLanes,
  onOrderedLanes,
  vimHotkeys,
  onVimHotkeys,
  layers,
  onLayers,
  hiddenKinds,
  onHiddenKinds,
  spotlightLabel,
  onClearSpotlight,
}: {
  orderedLanes: boolean;
  onOrderedLanes: (enabled: boolean) => void;
  vimHotkeys: boolean;
  onVimHotkeys: (enabled: boolean) => void;
  layers: CalendarLayers;
  onLayers: (layers: CalendarLayers) => void;
  hiddenKinds: ScheduleKind[];
  onHiddenKinds: (kinds: ScheduleKind[]) => void;
  spotlightLabel?: string;
  onClearSpotlight: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger
          render={
            <IconButton
              name="settings"
              label="Отображение"
              className="size-11 min-h-11 min-w-11 shrink-0"
            />
          }
        />
        <Dialog.Content
          showCloseButton={false}
          className="w-[min(380px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto p-4"
        >
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
            Дорожки расписаний, видимость карточек, слои календаря и подсветка.
          </Dialog.Description>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-u-selection-ink"
              checked={orderedLanes}
              onChange={(event) => onOrderedLanes(event.target.checked)}
              aria-describedby="ordered-lanes-note"
            />
            Дорожки расписаний
          </label>
          <p id="ordered-lanes-note" className="m-0 mb-3 text-xs text-u-muted">
            В порядке выбора. Выключите для компактного вида.
          </p>
          <fieldset
            className="m-0 mb-3 border-0 p-0"
            aria-describedby="visibility-note"
          >
            <legend className="text-sm font-semibold">
              Карточки расписаний
            </legend>
            {kinds.map(({ kind, label, icon }) => (
              <label
                key={kind}
                className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  className="size-4 accent-u-selection-ink"
                  checked={!hiddenKinds.includes(kind)}
                  onChange={(event) =>
                    onHiddenKinds(
                      event.target.checked
                        ? hiddenKinds.filter((value) => value !== kind)
                        : [...hiddenKinds, kind],
                    )
                  }
                />
                <Icon name={icon} size={16} />
                {label}
              </label>
            ))}
            <p
              id="visibility-note"
              className="m-0 text-xs leading-relaxed text-u-muted"
            >
              Скрытие карточек не меняет состав расчёта. Аудитории показаны
              только как занятость по расписанию.
            </p>
          </fieldset>
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
                  className="calendar-layer-icon"
                  data-layer={layer}
                >
                  <Icon name={layer} size={18} />
                </span>
                {layer === 'presence' ? 'В вузе' : 'Общие окна'}
              </label>
            ))}
          </fieldset>
          <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-3 border-t border-u-line-soft text-sm">
            <input
              type="checkbox"
              className="size-4 accent-u-selection-ink"
              checked={vimHotkeys}
              onChange={(event) => onVimHotkeys(event.target.checked)}
            />
            Vim-шорткаты
          </label>
          <p className="m-0 text-xs text-u-muted">
            h / l — день, j / k — прокрутка, ? — все команды.
          </p>
          <div>
            {spotlightLabel && (
              <Button
                variant="ghost"
                className="min-h-11 w-full justify-start text-sm [&>.u-button-label]:justify-start"
                onClick={onClearSpotlight}
                aria-label="Снять все выделения"
              >
                <Icon name="focus" size={18} />
                Снять все выделения
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
}
