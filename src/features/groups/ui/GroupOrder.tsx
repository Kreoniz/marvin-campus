import { useRef, useState, type CSSProperties } from 'react';
import { Button } from 'unlikely-ui/button';
import { Dialog } from 'unlikely-ui/dialog';
import type { Selection } from '../../../lib/types.ts';
import { colorStyle, type GroupColors } from '../../../lib/colors.ts';
import Icon from '../../../shared/ui/Icon.tsx';
import IconButton from '../../../shared/ui/IconButton.tsx';

interface Props {
  groups: Selection[];
  colors: GroupColors;
  open?: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (id: number, offset: number) => void;
  returnFocus: number;
}
export default function GroupOrder({
  groups,
  colors,
  open = false,
  onOpenChange,
  onMove,
  returnFocus,
}: Props) {
  const [announcement, setAnnouncement] = useState('');
  const list = useRef<HTMLOListElement>(null);
  function move(group: Selection, index: number, offset: number) {
    onMove(group.id, offset);
    setAnnouncement(
      `${group.label}: позиция ${index + offset + 1} из ${groups.length}.`,
    );
    requestAnimationFrame(() => {
      const row = list.current?.querySelector<HTMLElement>(
        `[data-group-id="${group.id}"]`,
      );
      const arrows = row?.querySelectorAll<HTMLButtonElement>('button');
      const preferred = arrows?.[offset < 0 ? 0 : 1];
      (preferred && !preferred.disabled
        ? preferred
        : Array.from(arrows ?? []).find((button) => !button.disabled)
      )?.focus();
      row?.scrollIntoView({ block: 'nearest' });
    });
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        className="w-[min(480px,calc(100vw-32px))]"
        finalFocus={() =>
          Array.from(
            document.querySelectorAll<HTMLButtonElement>(
              `[data-drag-id="${returnFocus}"]`,
            ),
          ).find((button) => button.offsetParent !== null) ?? true
        }
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <Dialog.Title className="m-0 text-xl leading-6">
            Порядок групп
          </Dialog.Title>
          <Dialog.Close
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="min-h-11 min-w-11 shrink-0"
                aria-label="Закрыть порядок групп"
              />
            }
          >
            <Icon name="close" />
          </Dialog.Close>
        </div>
        <Dialog.Description>
          Поменяй порядок групп в списке. Цвета и расположение пар в календаре
          останутся прежними.
        </Dialog.Description>
        <ol
          className="mt-5 flex max-h-[min(60dvh,440px)] list-none flex-col gap-2 overflow-y-auto p-0.5"
          ref={list}
        >
          {groups.map((group, index) => (
            <li
              key={group.id}
              data-group-id={group.id}
              className="flex items-center gap-1.5 rounded-[var(--u-radius)] border border-[color-mix(in_srgb,var(--chip)_70%,var(--u-line))] bg-[var(--chip)] px-1.75 py-1 [color:var(--u-category-ink)]"
              style={
                {
                  '--chip': colorStyle(colors[group.id] ?? 0).slice(7),
                } as CSSProperties
              }
            >
              <span className="min-w-6 text-xs">{index + 1}</span>
              <strong className="min-w-0 flex-1 text-sm">{group.label}</strong>
              <IconButton
                label={`Переместить ${group.label} выше`}
                name="up"
                className="text-inherit"
                disabled={index === 0}
                onClick={() => move(group, index, -1)}
              />
              <IconButton
                label={`Переместить ${group.label} ниже`}
                name="down"
                className="text-inherit"
                disabled={index === groups.length - 1}
                onClick={() => move(group, index, 1)}
              />
            </li>
          ))}
        </ol>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </Dialog.Content>
    </Dialog.Root>
  );
}
