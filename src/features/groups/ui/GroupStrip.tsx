import {
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
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
  onReveal?: (key: string) => HTMLElement | void;
  spotlightIds: string[];
  onSpotlight: (id: string) => void;
  onRemove: (key: string) => void;
  onClearSpotlights: () => void;
  hasSpotlights: boolean;
  onEmpty: () => void;
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
    onReveal,
    spotlightIds,
    onSpotlight,
    onRemove,
    onClearSpotlights,
    hasSpotlights,
    onEmpty,
  } = props;
  const label = scheduleLabels(schedules);
  const scroller = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState('');
  function focus(id: string, reveal = false) {
    requestAnimationFrame(() => {
      Array.from(
        scroller.current?.querySelectorAll<HTMLButtonElement>(
          `[data-schedule-trigger="${id}"]`,
        ) ?? [],
      )
        .find((button) => button.offsetParent !== null)
        ?.focus({ preventScroll: !reveal });
    });
  }
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
  function remove(group: Selection) {
    const index = groups.findIndex(
      (item) => scheduleKey(item) === scheduleKey(group),
    );
    const next = groups[index + 1] ?? groups[index - 1];
    onRemove(scheduleKey(group));
    setAnnouncement(`${label(group)} убрано из сравнения.`);
    if (next) focus(scheduleKey(next), true);
    else requestAnimationFrame(onEmpty);
  }
  function renderChip(group: Selection) {
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
        className={`${chipClassName} ${chipWidth(group)} ${!isGroup(group) && ['lecturer', 'auditorium'].includes(selectionKind(group)) ? `resource-card resource-chip resource-${selectionKind(group)}` : ''} overflow-hidden ${issue && selectionKind(group) !== 'vuc' ? 'outline-2 -outline-offset-2 outline-(--u-danger)' : ''}`}
        key={scheduleKey(group)}
        data-spotlight={
          spotlightIds.includes(scheduleKey(group)) ? '' : undefined
        }
        data-group-id={scheduleKey(group)}
        data-comparison-excluded={issue || undefined}
        data-kind={selectionKind(group)}
        data-hidden-kind={
          hiddenKinds.includes(selectionKind(group)) ? '' : undefined
        }
        title={issueText || undefined}
        style={chipStyle(colors[scheduleKey(group)] ?? 0)}
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
            onReveal={onReveal ? () => onReveal(scheduleKey(group)) : undefined}
            onRemove={() => remove(group)}
            onClearSpotlights={onClearSpotlights}
            hasSpotlights={hasSpotlights}
            color={chipColor(colors[scheduleKey(group)] ?? 0)}
            status={issueText}
            cardsHidden={hiddenKinds.includes(selectionKind(group))}
            groupKey={scheduleKey(group)}
            label={group.label}
            subgroups={subgroups}
            value={group.subgroup}
            subgroupNumber={group.subgroupNumber}
            describedBy={`group-order-help${issue ? ` group-issue-${scheduleKey(group)}` : ''}`}
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
            onReveal={onReveal ? () => onReveal(scheduleKey(group)) : undefined}
            onRemove={() => remove(group)}
            onClearSpotlights={onClearSpotlights}
            hasSpotlights={hasSpotlights}
            color={chipColor(colors[scheduleKey(group)] ?? 0)}
            resourceKind={
              selectionKind(group) === 'lecturer'
                ? 'lecturer'
                : selectionKind(group) === 'auditorium'
                  ? 'auditorium'
                  : undefined
            }
            status={issueText}
            trigger={
              <button
                type="button"
                className="flex min-h-11 min-w-0 flex-auto cursor-pointer items-center justify-center gap-1 border-0 bg-transparent px-2 text-inherit focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-(--u-category-ink)"
                data-schedule-trigger={scheduleKey(group)}
                aria-describedby={`group-order-help${issue ? ` group-issue-${scheduleKey(group)}` : ''}`}
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
        {issue && (
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
            {groups.map((group) => renderChip(group))}
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="horizontal" />
      </AutoHideScrollArea>
      <span id="group-order-help" className="sr-only">
        С клавиатуры: Alt и стрелки влево или вправо. Кнопки перемещения
        доступны в меню «Управлять выбранными».
      </span>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </>
  );
}
