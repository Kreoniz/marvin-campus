import { useRef, useState, type CSSProperties } from 'react';
import type { Selection } from '../../../lib/types.ts';
import { chipColor, type GroupColors } from '../../../lib/colors.ts';
import IconButton from '../../../shared/ui/IconButton.tsx';
import { selectionLabel } from '../../../lib/subgroups.ts';

const moveButtonClassName =
  'min-h-11 min-w-11 shrink-0 text-inherit hover:bg-black/7 data-disabled:cursor-default data-disabled:bg-transparent data-disabled:text-inherit data-disabled:opacity-30';

interface Props {
  groups: Selection[];
  colors: GroupColors;
  onMove: (id: number, offset: number) => void;
  onRemove: (id: number) => void;
  onEmpty: () => void;
}
export default function GroupOrder({
  groups,
  colors,
  onMove,
  onRemove,
  onEmpty,
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
    <>
      <ol
        data-group-order
        className="mt-2 flex max-h-[min(24dvh,220px)] list-none flex-col gap-2 overflow-y-auto p-0.5"
        ref={list}
      >
        {groups.map((group, index) => (
          <li
            key={group.id}
            data-group-id={group.id}
            className="flex items-center gap-1.5 rounded-[var(--u-radius)] border border-[color-mix(in_srgb,var(--chip)_70%,var(--u-line))] bg-[var(--chip)] px-1.75 py-1 [color:var(--u-category-ink)]"
            style={
              {
                '--chip': chipColor(colors[group.id] ?? 0),
              } as CSSProperties
            }
          >
            <strong className="min-w-0 flex-1 text-sm wrap-anywhere">
              {selectionLabel(group)}
            </strong>
            <IconButton
              label={`Переместить ${group.label} выше`}
              name="up"
              className={moveButtonClassName}
              disabled={index === 0}
              onClick={() => move(group, index, -1)}
            />
            <IconButton
              label={`Переместить ${group.label} ниже`}
              name="down"
              className={moveButtonClassName}
              disabled={index === groups.length - 1}
              onClick={() => move(group, index, 1)}
            />
            <IconButton
              label={`Убрать ${group.label}`}
              data-group-remove={group.id}
              name="close"
              className={moveButtonClassName}
              onClick={() => {
                const next = groups[index + 1] ?? groups[index - 1];
                if (next)
                  list.current
                    ?.querySelector<HTMLButtonElement>(
                      `[data-group-remove="${next.id}"]`,
                    )
                    ?.focus({ preventScroll: true });
                onRemove(group.id);
                setAnnouncement(`${group.label} убрана из сравнения.`);
                if (!next) onEmpty();
                else
                  requestAnimationFrame(() =>
                    list.current
                      ?.querySelector<HTMLButtonElement>(
                        `[data-group-id="${next.id}"] button:not(:disabled)`,
                      )
                      ?.focus(),
                  );
              }}
            />
          </li>
        ))}
      </ol>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
