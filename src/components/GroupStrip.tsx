import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { Button } from 'unlikely-ui/button';
import { Popover } from 'unlikely-ui/popover';
import type { GroupSchedule, Selection, Subgroup } from '../lib/types.ts';
import { mergeSubgroups } from '../lib/subgroups.ts';
import { colorStyle, type GroupColors } from '../lib/colors.ts';
import SubgroupPicker from './SubgroupPicker.tsx';
import IconButton from './IconButton.tsx';
import Icon from './Icon.tsx';

interface Props {
  groups: Selection[];
  schedules: GroupSchedule[];
  subgroupCatalog: Record<number, Subgroup[]>;
  colors: GroupColors;
  onRemove: (id: number) => void;
  onSubgroup: (id: number, value?: number) => void;
  onReorder: (groups: Selection[]) => void;
  onOrder: (id: number) => void;
}
interface Drag {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}
interface Pointer {
  id: number;
  group: Selection;
  capture: HTMLElement;
  x: number;
  y: number;
  rect: DOMRect;
}
const chipStyle = (color: number) =>
  ({ '--chip': colorStyle(color).slice(7) }) as CSSProperties;

export default function GroupStrip(props: Props) {
  const {
    groups,
    schedules,
    subgroupCatalog,
    colors,
    onRemove,
    onSubgroup,
    onReorder,
    onOrder,
  } = props;
  const scroller = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const [preview, setPreview] = useState<Selection[]>();
  const previewRef = useRef<Selection[] | undefined>(undefined);
  const [drag, setDrag] = useState<Drag>();
  const dragRef = useRef<Drag | undefined>(undefined);
  const pointer = useRef<Pointer | undefined>(undefined);
  const last = useRef({ x: 0, y: 0 });
  const frame = useRef(0);
  const suppressClick = useRef(false);
  const [announcement, setAnnouncement] = useState('');
  const shown = preview ?? groups;
  function focus(id: number) {
    requestAnimationFrame(() =>
      scroller.current
        ?.querySelector<HTMLButtonElement>(`[data-drag-id="${id}"]`)
        ?.focus({ preventScroll: true }),
    );
  }
  function start(event: PointerEvent<HTMLButtonElement>, group: Selection) {
    if (groups.length < 2 || event.button !== 0 || !event.isPrimary) return;
    const button = event.currentTarget;
    pointer.current = {
      id: event.pointerId,
      group,
      capture: button,
      x: event.clientX,
      y: event.clientY,
      rect: button.closest('.group-chip')!.getBoundingClientRect(),
    };
    button.setPointerCapture(event.pointerId);
    last.current = { x: event.clientX, y: event.clientY };
    suppressClick.current = false;
  }
  useEffect(() => {
    function updatePreview() {
      const p = pointer.current,
        root = scroller.current;
      if (!p || !dragRef.current || !root) return;
      const x =
        last.current.x - root.getBoundingClientRect().left + root.scrollLeft;
      const others = Array.from(
        root.querySelectorAll<HTMLElement>('.group-chip'),
      ).filter((el) => Number(el.dataset.groupId) !== p.group.id);
      const target = others.filter(
        (el) => x > el.offsetLeft + el.offsetWidth / 2,
      ).length;
      const shown = previewRef.current ?? latest.current.groups;
      const next = shown.filter((group) => group.id !== p.group.id);
      next.splice(target, 0, p.group);
      if (next.some((group, index) => group.id !== shown[index].id)) {
        previewRef.current = next;
        setPreview(next);
      }
    }
    function position() {
      const root = scroller.current;
      if (!pointer.current || !dragRef.current || !root) return;
      const bounds = root.getBoundingClientRect();
      if (last.current.x < bounds.left + 28) root.scrollLeft -= 7;
      else if (last.current.x > bounds.right - 28) root.scrollLeft += 7;
      updatePreview();
      frame.current = requestAnimationFrame(position);
    }
    function finish(commit: boolean) {
      const p = pointer.current;
      if (!p) return;
      if (commit) updatePreview();
      const next = previewRef.current;
      cancelAnimationFrame(frame.current);
      if (p.capture.hasPointerCapture(p.id))
        p.capture.releasePointerCapture(p.id);
      pointer.current = undefined;
      dragRef.current = undefined;
      previewRef.current = undefined;
      setDrag(undefined);
      setPreview(undefined);
      if (
        commit &&
        next &&
        next.some((g, i) => g.id !== latest.current.groups[i]?.id)
      ) {
        latest.current.onReorder(next);
        setAnnouncement(
          `${p.group.label}: позиция ${next.findIndex((g) => g.id === p.group.id) + 1} из ${next.length}.`,
        );
        focus(p.group.id);
      }
    }
    function move(event: globalThis.PointerEvent) {
      const p = pointer.current;
      if (!p || p.id !== event.pointerId) return;
      last.current = { x: event.clientX, y: event.clientY };
      if (
        !dragRef.current &&
        Math.hypot(event.clientX - p.x, event.clientY - p.y) < 6
      )
        return;
      event.preventDefault();
      const first = !dragRef.current;
      const value = {
        id: p.group.id,
        x: p.rect.left + event.clientX - p.x,
        y: p.rect.top + event.clientY - p.y,
        width: p.rect.width,
        height: p.rect.height,
      };
      dragRef.current = value;
      setDrag(value);
      if (first && scroller.current) {
        scroller.current.setPointerCapture(event.pointerId);
        p.capture = scroller.current;
        previewRef.current = latest.current.groups.slice();
        setPreview(previewRef.current);
        suppressClick.current = true;
        frame.current = requestAnimationFrame(position);
      }
    }
    function end(event: globalThis.PointerEvent) {
      if (pointer.current?.id === event.pointerId) {
        last.current = { x: event.clientX, y: event.clientY };
        finish(event.type === 'pointerup');
      }
    }
    function key(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape' && pointer.current) {
        event.preventDefault();
        finish(false);
      }
    }
    const blur = () => finish(false);
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('keydown', key);
    window.addEventListener('blur', blur);
    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('keydown', key);
      window.removeEventListener('blur', blur);
    };
  }, []);
  function keyboard(event: KeyboardEvent<HTMLButtonElement>, group: Selection) {
    if (!event.altKey || !['ArrowLeft', 'ArrowRight'].includes(event.key))
      return;
    event.preventDefault();
    const from = groups.findIndex((g) => g.id === group.id);
    const target = from + (event.key === 'ArrowLeft' ? -1 : 1);
    if (target < 0 || target >= groups.length) return;
    const next = groups.slice();
    next.splice(from, 1);
    next.splice(target, 0, group);
    onReorder(next);
    setAnnouncement(`${group.label}: позиция ${target + 1} из ${next.length}.`);
    focus(group.id);
  }
  return (
    <>
      <div
        className={`group-controls ${drag ? 'dragging' : ''}`}
        ref={scroller}
        role="group"
        aria-label="Выбранные группы"
      >
        {shown.map((group) => {
          const loaded = schedules.find((s) => s.selection.id === group.id);
          const subgroups = mergeSubgroups(
            subgroupCatalog[group.id] ?? [],
            loaded?.snapshot?.data.subgroups ?? [],
          );
          const subgroupLabel = group.subgroupNumber
            ? `Подгруппа ${group.subgroupNumber}`
            : group.subgroup
              ? (subgroups.find((item) => item.id === group.subgroup)?.label ??
                'Подгруппа')
              : 'Вся группа';
          return (
            <div
              className={`group-chip ${drag?.id === group.id ? 'drag-source' : ''}`}
              key={group.id}
              data-group-id={group.id}
              style={chipStyle(colors[group.id] ?? 0)}
            >
              <div className="desktop-group-content">
                <div className="chip-heading">
                  <button
                    className="group-drag"
                    type="button"
                    data-drag-id={group.id}
                    aria-label={`Порядок группы ${group.label}`}
                    aria-describedby="group-drag-help"
                    onPointerDown={(event) => start(event, group)}
                    onKeyDown={(event) => keyboard(event, group)}
                    onClick={(event) => {
                      if (suppressClick.current && event.detail !== 0) {
                        event.preventDefault();
                        suppressClick.current = false;
                        return;
                      }
                      if (groups.length > 1) onOrder(group.id);
                    }}
                  >
                    {group.label}
                  </button>
                  <IconButton
                    className="chip-remove"
                    label={`Убрать ${group.label}`}
                    name="close"
                    onClick={() => onRemove(group.id)}
                  />
                </div>
                <SubgroupPicker
                  label={group.label}
                  subgroups={subgroups}
                  value={group.subgroup}
                  subgroupNumber={group.subgroupNumber}
                  onChange={(value) => onSubgroup(group.id, value)}
                />
              </div>
              <div className="mobile-group-content">
                <Popover.Root>
                  <Popover.Trigger
                    className="mobile-group-trigger"
                    data-drag-id={group.id}
                    aria-label={`Настройки группы ${group.label}: ${subgroupLabel}`}
                  >
                    <strong>{group.label}</strong>
                    <span>
                      {subgroupLabel}
                      <Icon name="down" size={10} />
                    </span>
                  </Popover.Trigger>
                  <Popover.Content
                    className="group-settings"
                    positionerProps={{ sideOffset: 6 }}
                  >
                    <div className="group-settings-heading">
                      <Popover.Title>{group.label}</Popover.Title>
                      <Popover.Close
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Закрыть настройки ${group.label}`}
                          />
                        }
                      >
                        <Icon name="close" size={16} />
                      </Popover.Close>
                    </div>
                    <SubgroupPicker
                      label={group.label}
                      subgroups={subgroups}
                      value={group.subgroup}
                      subgroupNumber={group.subgroupNumber}
                      onChange={(value) => onSubgroup(group.id, value)}
                    />
                    {groups.length > 1 && (
                      <Popover.Close
                        render={
                          <Button
                            variant="secondary"
                            className="group-setting-action"
                          />
                        }
                        onClick={() => onOrder(group.id)}
                      >
                        <Icon name="order" size={16} />
                        Изменить порядок
                      </Popover.Close>
                    )}
                    <Popover.Close
                      render={
                        <Button
                          variant="secondary"
                          className="group-setting-action"
                        />
                      }
                      onClick={() => onRemove(group.id)}
                    >
                      <Icon name="close" size={16} />
                      Убрать группу
                    </Popover.Close>
                  </Popover.Content>
                </Popover.Root>
              </div>
            </div>
          );
        })}
      </div>
      {drag && (
        <div
          className="group-chip drag-ghost"
          aria-hidden="true"
          style={{
            ...chipStyle(colors[drag.id] ?? 0),
            left: drag.x,
            top: drag.y,
            width: drag.width,
            height: drag.height,
          }}
        >
          <strong>{groups.find((g) => g.id === drag.id)?.label}</strong>
          <span>Переместить группу</span>
        </div>
      )}
      <span id="group-drag-help" className="sr-only">
        Перетащи название группы. Нажми, чтобы менять порядок кнопками. С
        клавиатуры: Alt и стрелки влево или вправо.
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
