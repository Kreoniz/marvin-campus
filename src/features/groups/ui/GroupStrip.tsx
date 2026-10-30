import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { ScrollArea } from 'unlikely-ui/scroll-area';
import type {
  GroupSchedule,
  Selection,
  Subgroup,
  ScheduleKind,
} from '../../../lib/types.ts';
import {
  isGroup,
  scheduleKey,
  selectionKind,
  kindLabel,
  kindIcon,
} from '../../../lib/schedule-ref.ts';
import { scheduleLabels } from '../../../lib/selection-labels.ts';
import { mergeSubgroups, selectionLabel } from '../../../lib/subgroups.ts';
import { comparisonIssue } from '../../../lib/domain.ts';
import { chipColor, type GroupColors } from '../../../lib/colors.ts';
import SubgroupPicker from './SubgroupPicker.tsx';
import ScheduleMenu from './ScheduleMenu.tsx';
import Icon from '../../../shared/ui/Icon.tsx';
import AutoHideScrollArea from '../../../shared/ui/AutoHideScrollArea.tsx';

interface Props {
  groups: Selection[];
  day?: string;
  hiddenKinds?: ScheduleKind[];
  schedules: GroupSchedule[];
  subgroupCatalog: Record<number, Subgroup[]>;
  colors: GroupColors;
  onSubgroup: (id: string, value?: number) => void;
  onReorder: (groups: Selection[]) => void;
  onOrder: (id: string) => void;
  spotlightIds: string[];
  onSpotlight: (id: string) => void;
}
interface Drag {
  id: string;
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
  'group-chip flex h-11 shrink-0 rounded-[var(--u-radius)] bg-[var(--chip)] [color:var(--u-category-ink)]';
const chipWidth = (selection: Selection) =>
  selectionKind(selection) === 'lecturer'
    ? 'w-max min-w-32 max-w-52'
    : isGroup(selection)
      ? 'w-24 min-w-24'
      : 'w-max min-w-22 max-w-48';

export default function GroupStrip(props: Props) {
  const {
    groups,
    day,
    hiddenKinds = [],
    schedules,
    subgroupCatalog,
    colors,
    onSubgroup,
    onReorder,
    onOrder,
    spotlightIds,
    onSpotlight,
  } = props;
  const label = scheduleLabels(schedules);
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
  function focus(id: string) {
    requestAnimationFrame(() => {
      Array.from(
        scroller.current?.querySelectorAll<HTMLButtonElement>(
          `[data-drag-id="${id}"]`,
        ) ?? [],
      )
        .find((button) => button.offsetParent !== null)
        ?.focus({ preventScroll: true });
    });
  }
  function start(
    event: PointerEvent<HTMLElement>,
    group: Selection,
    button: HTMLButtonElement,
  ) {
    if (
      groups.length < 2 ||
      event.button !== 0 ||
      !event.isPrimary ||
      event.pointerType === 'touch'
    )
      return;
    pointer.current = {
      id: event.pointerId,
      group,
      capture: button,
      x: event.clientX,
      y: event.clientY,
      rect: button.closest('.group-chip')!.getBoundingClientRect(),
    };
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
      ).filter((el) => el.dataset.groupId !== scheduleKey(p.group));
      const target = others.filter(
        (el) => x > el.offsetLeft + el.offsetWidth / 2,
      ).length;
      const shown = previewRef.current ?? latest.current.groups;
      const next = shown.filter(
        (group) => scheduleKey(group) !== scheduleKey(p.group),
      );
      next.splice(target, 0, p.group);
      if (
        next.some(
          (group, index) => scheduleKey(group) !== scheduleKey(shown[index]),
        )
      ) {
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
        next.some(
          (g, i) =>
            scheduleKey(g) !==
            (latest.current.groups[i]
              ? scheduleKey(latest.current.groups[i])
              : undefined),
        )
      ) {
        latest.current.onReorder(next);
        setAnnouncement(
          `${p.group.label}: позиция ${next.findIndex((g) => scheduleKey(g) === scheduleKey(p.group)) + 1} из ${next.length}.`,
        );
        focus(scheduleKey(p.group));
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
        id: scheduleKey(p.group),
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
    const from = groups.findIndex((g) => scheduleKey(g) === scheduleKey(group));
    const target = from + (event.key === 'ArrowLeft' ? -1 : 1);
    if (target < 0 || target >= groups.length) return;
    const next = groups.slice();
    next.splice(from, 1);
    next.splice(target, 0, group);
    const control = event.currentTarget;
    onReorder(next);
    setAnnouncement(
      `${label(group)}: позиция ${target + 1} из ${next.length}.`,
    );
    requestAnimationFrame(() => control.focus({ preventScroll: true }));
  }
  function renderChip(group: Selection, ghost = false) {
    const loaded = schedules.find(
      (s) => scheduleKey(s.selection) === scheduleKey(group),
    );
    const issue =
      loaded && (!loaded.loading || loaded.snapshot)
        ? comparisonIssue(loaded, day)
        : undefined;
    const issueText =
      issue === 'subgroup'
        ? `Не удалось определить подгруппу ${group.subgroupNumber}. Расписание исключено из расчёта.`
        : issue === 'coverage'
          ? 'Нет подтверждённых данных документа на этот день. Расписание исключено из расчёта.'
          : issue
            ? selectionKind(group) === 'auditorium'
              ? 'Данные аудитории недоступны.'
              : 'Расписание недоступно. Расписание исключено из расчёта.'
            : '';
    const subgroups = mergeSubgroups(
      isGroup(group) ? (subgroupCatalog[group.id] ?? []) : [],
      loaded?.snapshot?.data.subgroups ?? [],
    );
    return (
      <div
        className={`${chipClassName} ${chipWidth(group)} ${!isGroup(group) && ['lecturer', 'auditorium'].includes(selectionKind(group)) ? `resource-card resource-chip resource-${selectionKind(group)}` : ''} overflow-hidden ${issue ? 'outline-2 -outline-offset-2 outline-(--u-danger)' : ''} ${!ghost && drag?.id === scheduleKey(group) ? 'opacity-35' : ''} ${ghost ? 'drag-chip pointer-events-none select-none' : ''}`}
        key={scheduleKey(group)}
        onPointerDownCapture={(event) => {
          if (ghost) return;
          const trigger = (
            event.target as HTMLElement
          ).closest<HTMLButtonElement>('button[data-drag-id]');
          if (trigger) start(event, group, trigger);
        }}
        onClickCapture={(event) => {
          // React capture also visits this chip for its portaled menu.
          if (!event.currentTarget.contains(event.target as Node)) return;
          if (event.detail === 0) suppressClick.current = false;
          else if (suppressClick.current) {
            event.preventDefault();
            event.stopPropagation();
            suppressClick.current = false;
          }
        }}
        data-spotlight={
          spotlightIds.includes(scheduleKey(group)) ? '' : undefined
        }
        data-group-id={ghost ? undefined : scheduleKey(group)}
        aria-hidden={ghost || undefined}
        inert={ghost || undefined}
        data-comparison-excluded={issue || undefined}
        data-kind={selectionKind(group)}
        data-hidden-kind={
          hiddenKinds.includes(selectionKind(group)) ? '' : undefined
        }
        title={issueText || undefined}
        style={{
          ...chipStyle(colors[scheduleKey(group)] ?? 0),
          ...(ghost && drag
            ? {
                position: 'fixed',
                zIndex: 120,
                left: drag.x,
                top: drag.y,
                width: drag.width,
                height: drag.height,
              }
            : {}),
        }}
      >
        {isGroup(group) ? (
          <SubgroupPicker
            spotlight={spotlightIds.includes(scheduleKey(group))}
            onSpotlight={
              groups.length > 1
                ? () => onSpotlight(scheduleKey(group))
                : undefined
            }
            onManage={() => onOrder(scheduleKey(group))}
            cardsHidden={hiddenKinds.includes(selectionKind(group))}
            groupKey={scheduleKey(group)}
            label={group.label}
            subgroups={subgroups}
            value={group.subgroup}
            subgroupNumber={group.subgroupNumber}
            describedBy={`group-drag-help${issue ? ` group-issue-${scheduleKey(group)}` : ''}`}
            onChange={(value) => onSubgroup(scheduleKey(group), value)}
            onKeyDown={(event) => keyboard(event, group)}
          />
        ) : (
          <ScheduleMenu
            label={label(group)}
            spotlight={spotlightIds.includes(scheduleKey(group))}
            onSpotlight={
              groups.length > 1
                ? () => onSpotlight(scheduleKey(group))
                : undefined
            }
            onManage={() => onOrder(scheduleKey(group))}
            trigger={
              <button
                type="button"
                className="flex min-h-11 min-w-0 flex-auto cursor-pointer items-center justify-center gap-1 border-0 bg-transparent px-2 text-inherit focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--u-category-ink)"
                data-drag-id={scheduleKey(group)}
                aria-describedby={`group-drag-help${issue ? ` group-issue-${scheduleKey(group)}` : ''}`}
                onKeyDown={(event) => keyboard(event, group)}
                title={`${kindLabel(selectionKind(group))}: ${label(group)}`}
                aria-label={`Меню расписания ${label(group)}`}
              >
                {selectionKind(group) !== 'vuc' && (
                  <span
                    className="shrink-0"
                    title={kindLabel(selectionKind(group))}
                  >
                    <Icon name={kindIcon(selectionKind(group))} size={14} />
                  </span>
                )}
                <strong className="resource-name block min-w-0 text-left text-xs leading-4 font-semibold whitespace-normal wrap-anywhere">
                  {selectionLabel(group)}
                  {label(group) !== selectionLabel(group) && (
                    <span className="block max-w-40 truncate text-[10px] leading-3 font-normal">
                      {label(group).slice(selectionLabel(group).length + 3)}
                    </span>
                  )}
                </strong>
                {hiddenKinds.includes(selectionKind(group)) && (
                  <Icon name="hidden" size={11} />
                )}
                <Icon name="down" size={10} />
              </button>
            }
          />
        )}
        {hiddenKinds.includes(selectionKind(group)) && (
          <span className="sr-only">Карточки этого вида скрыты.</span>
        )}
        {issue && !ghost && (
          <span id={`group-issue-${scheduleKey(group)}`} className="sr-only">
            {issueText}
          </span>
        )}
      </div>
    );
  }
  return (
    <>
      <AutoHideScrollArea
        className="group-selection-scroll group/groups h-14 min-w-0 compact:flex-1 [--u-scroll-area-size:8px]"
        data-dragging={drag ? '' : undefined}
        role="group"
        aria-label="Выбранные расписания"
      >
        <ScrollArea.Viewport
          ref={scroller}
          className="group-controls relative pb-2"
          role="region"
          aria-label="Прокрутка выбранных расписаний"
        >
          <ScrollArea.Content className="flex h-full w-max min-w-full items-center gap-1.5 p-0.5 [&>*]:shrink-0 compact:gap-1 compact:p-0">
            {shown.map((group) => renderChip(group))}
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="horizontal" />
      </AutoHideScrollArea>
      {drag &&
        groups
          .filter((group) => scheduleKey(group) === drag.id)
          .map((group) => renderChip(group, true))}
      <span id="group-drag-help" className="sr-only">
        Перетащи расписание мышью. С клавиатуры: Alt и стрелки влево или вправо.
        Кнопки перемещения доступны в меню «Управлять выбранными».
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
