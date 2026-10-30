import {
  useId,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
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
import {
  scheduleLabels,
  selectionLabels,
} from '../../../lib/selection-labels.ts';
import { useResourceInspector } from '../../resources/ResourceInspector.tsx';

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
  const { schedules } = useResourceInspector();
  const label = schedules.length
    ? scheduleLabels(schedules)
    : selectionLabels(groups);
  const [announcement, setAnnouncement] = useState('');
  const helpId = useId();
  const list = useRef<HTMLOListElement>(null);
  const dragging = useRef<string | undefined>(undefined);
  const previewRef = useRef<Selection[] | undefined>(undefined);
  const [preview, setPreview] = useState<Selection[]>();
  const [dragId, setDragId] = useState<string>();
  const shown = preview ?? groups;
  function focus(key: string, control = 'drag') {
    requestAnimationFrame(() => {
      const row = list.current?.querySelector<HTMLElement>(
        `[data-group-id="${key}"]`,
      );
      const preferred = row?.querySelector<HTMLButtonElement>(
        `[data-order-control="${control}"]:not(:disabled)`,
      );
      (
        preferred ??
        row?.querySelector<HTMLButtonElement>('button:not(:disabled)')
      )?.focus({ preventScroll: true });
      row?.scrollIntoView({ block: 'nearest' });
    });
  }
  function move(group: Selection, index: number, offset: number) {
    const control = (document.activeElement as HTMLElement)?.dataset
      .orderControl;
    onMove(scheduleKey(group), offset);
    setAnnouncement(
      `${label(group)}: позиция ${index + offset + 1} из ${groups.length}.`,
    );
    focus(scheduleKey(group), control);
  }
  function keyboard(
    event: KeyboardEvent<HTMLButtonElement>,
    group: Selection,
    index: number,
  ) {
    if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const offset = event.key === 'ArrowUp' ? -1 : 1;
    if (index + offset >= 0 && index + offset < groups.length)
      move(group, index, offset);
  }
  function finish(commit: boolean) {
    const key = dragging.current;
    const next = previewRef.current;
    dragging.current = undefined;
    previewRef.current = undefined;
    setDragId(undefined);
    setPreview(undefined);
    if (!key) return;
    const from = groups.findIndex((group) => scheduleKey(group) === key);
    const target = next?.findIndex((group) => scheduleKey(group) === key) ?? -1;
    if (
      commit &&
      from >= 0 &&
      target >= 0 &&
      next?.length === groups.length &&
      next.every((group) =>
        groups.some((current) => scheduleKey(current) === scheduleKey(group)),
      )
    ) {
      // The existing onMove contract swaps neighbors. Adjacent moves insert the
      // dragged schedule without reversing the schedules between its endpoints.
      const step = Math.sign(target - from);
      for (let position = from; position !== target; position += step)
        onMove(key, step);
      const group = groups[from];
      setAnnouncement(
        `${label(group)}: позиция ${target + 1} из ${groups.length}.`,
      );
    }
    focus(key);
  }
  function over(event: DragEvent<HTMLOListElement>) {
    const key = dragging.current;
    if (!key || !list.current) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const rows = Array.from(
      list.current.querySelectorAll<HTMLElement>('[data-group-id]'),
    ).filter((row) => row.dataset.groupId !== key);
    const target = rows.filter((row) => {
      const bounds = row.getBoundingClientRect();
      return event.clientY > bounds.top + bounds.height / 2;
    }).length;
    const current = previewRef.current ?? groups;
    const selected = current.find((group) => scheduleKey(group) === key);
    if (!selected) return;
    const next = current.filter((group) => scheduleKey(group) !== key);
    next.splice(target, 0, selected);
    if (
      next.some(
        (group, index) => scheduleKey(group) !== scheduleKey(current[index]),
      )
    ) {
      previewRef.current = next;
      setPreview(next);
    }
  }
  return (
    <>
      {/* Native drop surface retains list semantics; keyboard actions live on buttons. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <ol
        data-group-order
        className="mt-1 mb-0 flex list-none flex-col gap-1.5 p-0.5"
        ref={list}
        onDragOver={over}
        onDrop={(event) => {
          if (!dragging.current) return;
          event.preventDefault();
          finish(true);
        }}
      >
        {shown.map((group, index) => (
          <li
            key={scheduleKey(group)}
            data-group-id={scheduleKey(group)}
            data-dragging={dragId === scheduleKey(group) ? '' : undefined}
            className="flex shrink-0 items-center gap-1.5 rounded-[var(--u-radius)] border border-u-line-soft bg-u-surface px-1.75 py-1 text-u-ink"
            style={
              {
                '--chip': chipColor(colors[scheduleKey(group)] ?? 0),
              } as CSSProperties
            }
          >
            <button
              type="button"
              draggable={groups.length > 1}
              onKeyDown={(event) => keyboard(event, group, index)}
              data-order-control="drag"
              className="order-drag flex min-h-11 min-w-0 flex-1 cursor-grab items-center gap-2 rounded-sm border-0 bg-transparent p-0 text-left text-inherit active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-u-focus"
              aria-label={`Переместить ${label(group)}`}
              aria-describedby={helpId}
              onDragStart={(event) => {
                if (groups.length < 2) {
                  event.preventDefault();
                  return;
                }
                dragging.current = scheduleKey(group);
                previewRef.current = groups.slice();
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', scheduleKey(group));
                const row = event.currentTarget.closest('li');
                if (row) event.dataTransfer.setDragImage(row, 24, 24);
                setDragId(scheduleKey(group));
                setPreview(previewRef.current);
              }}
              onDragEnd={() => finish(false)}
            >
              <span
                className="flex h-8 w-4 shrink-0 items-center justify-center rounded-sm bg-(--chip) text-(--u-category-ink)"
                aria-hidden="true"
              >
                <Icon name="order" size={14} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm wrap-anywhere">
                  {label(group)}
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
            </button>
            <IconButton
              label={`Переместить ${label(group)} выше`}
              name="up"
              onKeyDown={(event) => keyboard(event, group, index)}
              data-order-control="up"
              className={moveButtonClassName}
              disabled={index === 0}
              onClick={() => move(group, index, -1)}
            />
            <IconButton
              label={`Переместить ${label(group)} ниже`}
              name="down"
              onKeyDown={(event) => keyboard(event, group, index)}
              data-order-control="down"
              className={moveButtonClassName}
              disabled={index === groups.length - 1}
              onClick={() => move(group, index, 1)}
            />
            <IconButton
              label={`Убрать ${label(group)}`}
              data-group-remove={scheduleKey(group)}
              name="close"
              onKeyDown={(event) => keyboard(event, group, index)}
              data-order-control="remove"
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
                setAnnouncement(`${label(group)} убрана из сравнения.`);
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
      <p id={helpId} className="sr-only">
        Перетащи расписание мышью. Кнопки выше и ниже работают на сенсорном
        экране. С клавиатуры: Alt и стрелки вверх или вниз.
      </p>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </>
  );
}
