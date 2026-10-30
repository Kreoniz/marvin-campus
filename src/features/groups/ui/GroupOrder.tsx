import { useRef, useState, type CSSProperties } from 'react';
import {
  scheduleKey,
  selectionKind,
  kindLabel,
  kindIcon,
} from '../../../lib/schedule-ref.ts';
import Icon from '../../../shared/ui/Icon.tsx';
import type { Selection, ScheduleKind } from '../../../lib/types.ts';
import { chipColor, type GroupColors } from '../../../lib/colors.ts';
import IconButton from '../../../shared/ui/IconButton.tsx';
import { selectionLabel } from '../../../lib/subgroups.ts';

const moveButtonClassName =
  'min-h-11 min-w-11 shrink-0 text-u-ink hover:bg-u-well data-disabled:cursor-default data-disabled:bg-transparent data-disabled:opacity-30';

interface Props {
  groups: Selection[];
  hiddenKinds?: ScheduleKind[];
  colors: GroupColors;
  onMove: (id: string, offset: number) => void;
  onRemove: (id: string) => void;
  onEmpty: () => void;
}
export default function GroupOrder({
  groups,
  hiddenKinds = [],
  colors,
  onMove,
  onRemove,
  onEmpty,
}: Props) {
  const [announcement, setAnnouncement] = useState('');
  const list = useRef<HTMLOListElement>(null);
  function move(group: Selection, index: number, offset: number) {
    onMove(scheduleKey(group), offset);
    setAnnouncement(
      `${group.label}: позиция ${index + offset + 1} из ${groups.length}.`,
    );
    requestAnimationFrame(() => {
      const row = list.current?.querySelector<HTMLElement>(
        `[data-group-id="${scheduleKey(group)}"]`,
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
        className="mt-1 mb-0 flex list-none flex-col gap-1.5 p-0.5"
        ref={list}
      >
        {groups.map((group, index) => (
          <li
            key={scheduleKey(group)}
            data-group-id={scheduleKey(group)}
            className="flex shrink-0 items-center gap-1.5 rounded-[var(--u-radius)] border border-u-line-soft bg-u-surface px-1.75 py-1 text-u-ink"
            style={
              {
                '--chip': chipColor(colors[scheduleKey(group)] ?? 0),
              } as CSSProperties
            }
          >
            <span
              className="h-8 w-1 shrink-0 rounded-full bg-(--chip)"
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <strong className="block text-sm wrap-anywhere">
                {selectionLabel(group)}
              </strong>
              <span className="flex items-center gap-1 text-[11px]">
                <Icon name={kindIcon(selectionKind(group))} size={11} />
                {kindLabel(selectionKind(group))}
                {hiddenKinds.includes(selectionKind(group)) && (
                  <>
                    <Icon name="hidden" size={11} /> Скрыто
                  </>
                )}
              </span>
            </span>
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
              data-group-remove={scheduleKey(group)}
              name="close"
              className={moveButtonClassName}
              onClick={() => {
                const next = groups[index + 1] ?? groups[index - 1];
                if (next)
                  list.current
                    ?.querySelector<HTMLButtonElement>(
                      `[data-group-remove="${scheduleKey(next)}"]`,
                    )
                    ?.focus({ preventScroll: true });
                onRemove(scheduleKey(group));
                setAnnouncement(`${group.label} убрана из сравнения.`);
                if (!next) onEmpty();
                else
                  requestAnimationFrame(() =>
                    list.current
                      ?.querySelector<HTMLButtonElement>(
                        `[data-group-id="${scheduleKey(next)}"] button:not(:disabled)`,
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
