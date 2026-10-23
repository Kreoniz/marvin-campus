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
import { ScrollArea } from 'unlikely-ui/scroll-area';
import type { GroupSchedule, Selection, Subgroup } from '../../../lib/types.ts';
import { mergeSubgroups } from '../../../lib/subgroups.ts';
import { comparisonIssue } from '../../../lib/domain.ts';
import { chipColor, type GroupColors } from '../../../lib/colors.ts';
import SubgroupPicker from './SubgroupPicker.tsx';
import IconButton from '../../../shared/ui/IconButton.tsx';
import Icon from '../../../shared/ui/Icon.tsx';
import AutoHideScrollArea from '../../../shared/ui/AutoHideScrollArea.tsx';

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
  ({ '--chip': chipColor(color) }) as CSSProperties;
const chipClassName =
  'group-chip w-32 min-w-32 rounded-[var(--u-radius)] border border-[color-mix(in_srgb,var(--chip)_70%,var(--u-line))] bg-[var(--chip)] px-1.25 py-0.5 [color:var(--u-category-ink)] compact:w-26 compact:min-w-26 compact:p-0';
const settingActionClassName =
  'mt-2 min-h-11 w-full justify-start font-medium [&>.u-button-label]:justify-start';

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
  function remove(id: number) {
    const index = groups.findIndex((group) => group.id === id);
    const remaining = groups.filter((group) => group.id !== id);
    const next = remaining[Math.min(index, remaining.length - 1)];
    const container = scroller.current?.closest('.group-strip');
    onRemove(id);
    requestAnimationFrame(() => {
      const target = next
        ? Array.from(
            container?.querySelectorAll<HTMLButtonElement>(
              `[data-drag-id="${next.id}"]`,
            ) ?? [],
          ).find((button) => button.getClientRects().length)
        : container?.querySelector<HTMLButtonElement>('.add-group');
      target?.focus({ preventScroll: true });
    });
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
      <AutoHideScrollArea
        className="group/groups h-19.25 min-w-0 compact:h-[calc(3.25rem+var(--u-scroll-area-size))] compact:flex-1 pointer-coarse:[@media(min-width:701px)_and_(min-height:501px)]:h-25.25"
        data-dragging={drag ? '' : undefined}
        role="group"
        aria-label="Выбранные группы"
      >
        <ScrollArea.Viewport
          ref={scroller}
          className="group-controls relative"
          role="region"
          aria-label="Прокрутка выбранных групп"
        >
          <ScrollArea.Content className="flex h-full w-max min-w-full items-center gap-2.25 p-1 pb-[var(--u-scroll-area-size)] [&>*]:shrink-0 compact:gap-2 compact:pt-0.75">
            {shown.map((group) => {
              const loaded = schedules.find((s) => s.selection.id === group.id);
              const issue =
                loaded && (!loaded.loading || loaded.snapshot)
                  ? comparisonIssue(loaded)
                  : undefined;
              const issueText =
                issue === 'subgroup'
                  ? `Не удалось определить подгруппу ${group.subgroupNumber}. Группа исключена из расчёта.`
                  : issue
                    ? 'Расписание недоступно. Группа исключена из расчёта.'
                    : '';
              const subgroups = mergeSubgroups(
                subgroupCatalog[group.id] ?? [],
                loaded?.snapshot?.data.subgroups ?? [],
              );
              const subgroupLabel = group.subgroupNumber
                ? `Подгруппа ${group.subgroupNumber}`
                : group.subgroup
                  ? (subgroups.find((item) => item.id === group.subgroup)
                      ?.label ?? 'Подгруппа')
                  : 'Вся группа';
              return (
                <div
                  className={`${chipClassName} ${issue ? 'outline-2 outline-(--u-danger)' : ''} ${drag?.id === group.id ? 'opacity-35' : ''}`}
                  key={group.id}
                  data-group-id={group.id}
                  data-comparison-excluded={issue || undefined}
                  title={issueText || undefined}
                  style={chipStyle(colors[group.id] ?? 0)}
                >
                  <div className="compact:hidden">
                    <div className="flex items-center justify-between gap-0.5">
                      <button
                        className="min-h-7 min-w-0 touch-none cursor-grab truncate border-0 bg-transparent px-0 py-0.5 text-[13px] font-bold text-inherit group-data-dragging/groups:cursor-grabbing pointer-coarse:min-h-11"
                        type="button"
                        data-drag-id={group.id}
                        aria-label={`Порядок группы ${group.label}`}
                        aria-describedby={`group-drag-help${issue ? ` group-issue-${group.id}` : ''}`}
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
                      {issue && (
                        <span className="shrink-0" aria-hidden="true">
                          <Icon name="alert" size={14} />
                        </span>
                      )}
                      <IconButton
                        className="size-7 min-h-7 min-w-7 border-0 bg-transparent p-0 text-inherit hover:bg-black/7 pointer-coarse:size-11 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
                        label={`Убрать ${group.label}`}
                        name="close"
                        onClick={() => remove(group.id)}
                      />
                    </div>
                    <SubgroupPicker
                      compact
                      label={group.label}
                      subgroups={subgroups}
                      value={group.subgroup}
                      subgroupNumber={group.subgroupNumber}
                      onChange={(value) => onSubgroup(group.id, value)}
                    />
                  </div>
                  <div className="hidden compact:block">
                    <Popover.Root>
                      <Popover.Trigger
                        className="flex min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-[5px] border-0 bg-transparent p-1 text-xs leading-[1.2] text-inherit"
                        data-drag-id={group.id}
                        aria-label={`Настройки группы ${group.label}: ${subgroupLabel}`}
                        aria-describedby={
                          issue ? `group-issue-${group.id}` : undefined
                        }
                      >
                        <strong className="flex max-w-full items-center gap-1 truncate leading-[1.2]">
                          {group.label}
                          {issue && <Icon name="alert" size={14} />}
                        </strong>
                        <span className="flex max-w-full items-center gap-0.75 text-[11px] leading-[1.2]">
                          {subgroupLabel}
                          <Icon name="down" size={10} />
                        </span>
                      </Popover.Trigger>
                      <Popover.Content
                        className="w-62.5 max-w-[calc(100vw-32px)] p-3.5"
                        positionerProps={{ sideOffset: 6 }}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <Popover.Title className="m-0 text-xl leading-6">
                            {group.label}
                          </Popover.Title>
                          <Popover.Close
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="min-h-11 min-w-11 shrink-0"
                                aria-label={`Закрыть настройки ${group.label}`}
                              />
                            }
                          >
                            <Icon name="close" size={16} />
                          </Popover.Close>
                        </div>
                        {issue && (
                          <p className="mb-3 text-xs leading-snug">
                            {issueText}
                          </p>
                        )}
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
                                className={settingActionClassName}
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
                              className={settingActionClassName}
                            />
                          }
                          onClick={() => remove(group.id)}
                        >
                          <Icon name="close" size={16} />
                          Убрать группу
                        </Popover.Close>
                      </Popover.Content>
                    </Popover.Root>
                  </div>
                  {issue && (
                    <span id={`group-issue-${group.id}`} className="sr-only">
                      {issueText}
                    </span>
                  )}
                </div>
              );
            })}
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="horizontal" />
      </AutoHideScrollArea>
      {drag && (
        <div
          className={`${chipClassName} pointer-events-none fixed z-120 flex flex-col justify-center gap-1.5 text-xs shadow-[3px_5px_16px_#0003] select-none`}
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
          <span className="text-[11px]">Переместить группу</span>
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
