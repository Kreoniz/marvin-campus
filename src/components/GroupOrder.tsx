import { useRef, useState, type CSSProperties } from 'react';
import { Button } from 'unlikely-ui/button';
import { Dialog } from 'unlikely-ui/dialog';
import type { Selection } from '../lib/types.ts';
import { colorStyle, type GroupColors } from '../lib/colors.ts';
import Icon from './Icon.tsx';
import IconButton from './IconButton.tsx';

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
        className="campus-order-dialog"
        finalFocus={() =>
          Array.from(
            document.querySelectorAll<HTMLButtonElement>(
              `[data-drag-id="${returnFocus}"]`,
            ),
          ).find((button) => button.offsetParent !== null) ?? true
        }
      >
        <div className="control-dialog-heading">
          <Dialog.Title>Порядок групп</Dialog.Title>
          <Dialog.Close
            render={
              <Button
                variant="ghost"
                size="icon-sm"
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
        <ol className="order-list" ref={list}>
          {groups.map((group, index) => (
            <li
              key={group.id}
              data-group-id={group.id}
              style={
                {
                  '--chip': colorStyle(colors[group.id] ?? 0).slice(7),
                } as CSSProperties
              }
            >
              <span className="order-number">{index + 1}</span>
              <strong>{group.label}</strong>
              <IconButton
                label={`Переместить ${group.label} выше`}
                name="up"
                disabled={index === 0}
                onClick={() => move(group, index, -1)}
              />
              <IconButton
                label={`Переместить ${group.label} ниже`}
                name="down"
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
