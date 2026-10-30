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
import { mergeSubgroups } from '../../../lib/subgroups.ts';
import { comparisonIssue } from '../../../lib/domain.ts';
import { chipColor, type GroupColors } from '../../../lib/colors.ts';
import SubgroupPicker from './SubgroupPicker.tsx';
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
  'group-chip flex rounded-[var(--u-radius)] bg-[var(--chip)] [color:var(--u-category-ink)] compact:max-w-44 compact:flex-1';
const chipWidth = (selection: Selection) =>
  selectionKind(selection) === 'lecturer'
    ? 'w-44 min-w-44 compact:w-40 compact:min-w-40'
    : 'w-36 min-w-36 compact:w-29 compact:min-w-29';

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
    setAnnouncement(`${group.label}: позиция ${target + 1} из ${next.length}.`);
    requestAnimationFrame(() => control.focus({ preventScroll: true }));
  }
  return (
    <>
      <AutoHideScrollArea
        className="group/groups h-12 min-w-0 compact:h-11 compact:flex-1 compact:[--u-scroll-area-size:4px]"
        data-dragging={drag ? '' : undefined}
        role="group"
        aria-label="Выбранные расписания"
      >
        <ScrollArea.Viewport
          ref={scroller}
          className="group-controls relative"
          role="region"
          aria-label="Прокрутка выбранных расписаний"
        >
          <ScrollArea.Content className="flex h-full w-max min-w-full items-center gap-2 p-0.5 pb-1 [&>*]:shrink-0 compact:gap-1.5 compact:p-0">
            {shown.map((group) => {
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
                  className={`${chipClassName} ${chipWidth(group)} overflow-hidden ${issue ? 'outline-2 outline-(--u-danger)' : ''} ${drag?.id === scheduleKey(group) ? 'opacity-35' : ''}`}
                  key={scheduleKey(group)}
                  data-group-id={scheduleKey(group)}
                  data-comparison-excluded={issue || undefined}
                  data-kind={selectionKind(group)}
                  data-hidden-kind={
                    hiddenKinds.includes(selectionKind(group)) ? '' : undefined
                  }
                  title={issueText || undefined}
                  style={chipStyle(colors[scheduleKey(group)] ?? 0)}
                >
                  <button
                    className="flex min-h-11 w-7 shrink-0 touch-none cursor-grab items-center justify-center border-0 bg-transparent p-0 text-inherit group-data-dragging/groups:cursor-grabbing compact:hidden"
                    type="button"
                    data-drag-id={scheduleKey(group)}
                    aria-label={`Переместить ${group.label}`}
                    aria-describedby="group-drag-help"
                    onPointerDown={(event) => start(event, group)}
                    onKeyDown={(event) => keyboard(event, group)}
                    onClick={(event) => {
                      if (suppressClick.current && event.detail !== 0) {
                        event.preventDefault();
                        suppressClick.current = false;
                        return;
                      }
                      onOrder(scheduleKey(group));
                    }}
                  >
                    <Icon name="order" size={14} />
                  </button>
                  {isGroup(group) ? (
                    <SubgroupPicker
                      groupKey={scheduleKey(group)}
                      label={group.label}
                      subgroups={subgroups}
                      value={group.subgroup}
                      subgroupNumber={group.subgroupNumber}
                      describedBy={
                        issue ? `group-issue-${scheduleKey(group)}` : undefined
                      }
                      onChange={(value) =>
                        onSubgroup(scheduleKey(group), value)
                      }
                      onKeyDown={(event) => keyboard(event, group)}
                    />
                  ) : (
                    <button
                      type="button"
                      className="flex min-h-11 min-w-18 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 border-0 bg-transparent px-1 text-inherit focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--u-category-ink)"
                      data-drag-id={scheduleKey(group)}
                      onClick={() => onOrder(scheduleKey(group))}
                      onKeyDown={(event) => keyboard(event, group)}
                      title={`${kindLabel(selectionKind(group))}: ${group.label}`}
                      aria-label={`Управлять расписанием ${group.label}`}
                    >
                      <strong className="block max-w-full truncate text-[13px]">
                        {selectionKind(group) === 'vuc'
                          ? group.label.replace(/^ВУЦ\s*·\s*/iu, '')
                          : group.label}
                      </strong>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Icon name={kindIcon(selectionKind(group))} size={11} />
                        {selectionKind(group) === 'lecturer'
                          ? 'Преп.'
                          : selectionKind(group) === 'auditorium'
                            ? 'Ауд.'
                            : 'ВУЦ'}
                      </span>
                    </button>
                  )}
                  {groups.length > 1 && (
                    <button
                      type="button"
                      className="group-spotlight flex size-11 min-h-11 min-w-11 shrink-0 items-center justify-center rounded-r-[var(--u-radius)] border-0 bg-transparent p-0 text-inherit shadow-[inset_1px_0_#14201633] hover:bg-black/7 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--u-category-ink) aria-pressed:bg-[color-mix(in_srgb,var(--chip)_70%,white)] aria-pressed:[&_svg]:stroke-[2.5]"
                      data-drag-id={scheduleKey(group)}
                      aria-label={`Выделить ${group.label}`}
                      aria-pressed={spotlightIds.includes(scheduleKey(group))}
                      onClick={() => onSpotlight(scheduleKey(group))}
                      onKeyDown={(event) => keyboard(event, group)}
                    >
                      <Icon
                        name={
                          spotlightIds.includes(scheduleKey(group))
                            ? 'tick'
                            : 'focus'
                        }
                        size={18}
                      />
                    </button>
                  )}
                  {hiddenKinds.includes(selectionKind(group)) && (
                    <span className="sr-only">Карточки этого вида скрыты.</span>
                  )}
                  {issue && (
                    <span
                      id={`group-issue-${scheduleKey(group)}`}
                      className="sr-only"
                    >
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
          <strong>
            {groups.find((g) => scheduleKey(g) === drag.id)?.label}
          </strong>
          <span className="text-[11px]">Переместить расписание</span>
        </div>
      )}
      <span id="group-drag-help" className="sr-only">
        Перетащи значок рядом с расписанием. Нажми, чтобы менять порядок
        кнопками. С клавиатуры: Alt и стрелки влево или вправо.
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
