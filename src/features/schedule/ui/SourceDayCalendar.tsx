import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { Skeleton } from 'unlikely-ui/skeleton';
import { Select } from 'unlikely-ui/select';
import type {
  GroupSchedule,
  ScheduleKind,
  Subgroup,
} from '../../../lib/types.ts';
import {
  comparisonIssue,
  comparisonScope,
  compareDay,
} from '../../../lib/domain.ts';
import { formatDay, timeLabel } from '../../../lib/dates.ts';
import {
  scheduleKey,
  selectionKind,
  kindLabel,
  kindIcon,
} from '../../../lib/schedule-ref.ts';
import { scheduleLabels } from '../../../lib/selection-labels.ts';
import { lessonColor, type GroupColors } from '../../../lib/colors.ts';
import { lessonBlocks } from '../../../lib/lesson-layout.ts';
import {
  sourceTracks,
  sourceAnchor,
  restoreSourceAnchor,
  SOURCE_INSET,
} from '../model/source-layout.ts';
import {
  VERTICAL_CARD_WIDTH,
  VERTICAL_LANE_PITCH,
} from '../model/vertical-layout.ts';
import Icon from '../../../shared/ui/Icon.tsx';
import LessonCard from './LessonCard.tsx';
import { calendarBounds } from '../model/calendar-bounds.ts';
import ComparisonHighlights, {
  type CalendarLayers,
} from './ComparisonHighlights.tsx';

interface Props {
  schedules: GroupSchedule[];
  colors: GroupColors;
  subgroupCatalog: Record<number, Subgroup[]>;
  day: string;
  layers: CalendarLayers;
  loading: boolean;
  placeholder?: boolean;
  spotlightIds: string[];
  hiddenKinds: ScheduleKind[];
  vucOnly?: boolean;
}
const scale = 1;
const rail = 44;
export default function SourceDayCalendar({
  schedules,
  colors,
  subgroupCatalog,
  day,
  layers,
  loading,
  placeholder = false,
  spotlightIds,
  hiddenKinds,
  vucOnly = false,
}: Props) {
  const label = scheduleLabels(schedules);
  const scroller = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLDivElement>(null);
  const anchor = useRef<ReturnType<typeof sourceAnchor>>(undefined);
  const pendingJump = useRef<string | null>(null);
  const [jumped, setJumped] = useState('');
  const requested = schedules.find(
    (schedule) => scheduleKey(schedule.selection) === jumped,
  );
  const notice =
    requested && hiddenKinds.includes(selectionKind(requested.selection))
      ? `${label(requested.selection)}: карточки этого вида скрыты. Включи их в «Отображение» или нажми «Показать всё».`
      : '';
  const visible = schedules.filter(
    (schedule) => !hiddenKinds.includes(selectionKind(schedule.selection)),
  );
  const blocks = lessonBlocks(schedules, day);
  const { start, end } = calendarBounds(
    blocks.map((block) => block.lesson),
    vucOnly,
  );
  const tracks = sourceTracks(
    blocks,
    visible.map((schedule) => schedule.selection),
    start,
    scale,
  );
  const width = Math.max(
    rail + 172,
    rail +
      (tracks.at(-1)?.left ?? 0) +
      (tracks.at(-1)?.width ?? 160) +
      SOURCE_INSET,
  );
  const height = Math.max(
    (end - start) * scale,
    ...tracks.flatMap((track) =>
      track.occurrences.map((occurrence) => occurrence.top + occurrence.height),
    ),
  );
  const scope = comparisonScope(schedules, day);
  const result = compareDay(schedules, day);
  const includedKeys = new Set(
    scope.included.map((schedule) => scheduleKey(schedule.selection)),
  );
  const saved = scope.included.some(
    (schedule) =>
      schedule.snapshot && (schedule.snapshot.stale || schedule.error),
  );
  const geometryKey = tracks
    .map((track) => `${track.key}:${track.left}:${track.width}`)
    .join('|');
  const previousTracks = useRef(tracks);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const hasSnapshot = schedules.some((schedule) => schedule.snapshot);
  function syncScroll() {
    const viewport = scroller.current;
    if (!viewport) return;
    if (header.current)
      header.current.style.transform = `translateX(${-viewport.scrollLeft}px)`;
    anchor.current = sourceAnchor(tracksRef.current, viewport.scrollLeft);
  }
  useLayoutEffect(() => {
    const viewport = scroller.current;
    if (!viewport) return;
    const restored = restoreSourceAnchor(
      anchor.current,
      previousTracks.current,
      tracksRef.current,
    );
    if (restored !== undefined) viewport.scrollLeft = restored;
    previousTracks.current = tracksRef.current;
    syncScroll();
  }, [geometryKey, day]);
  const status = (schedule: GroupSchedule) => {
    const issue = comparisonIssue(schedule, day);
    return issue === 'subgroup'
      ? 'Подгруппа не определена'
      : issue === 'coverage'
        ? 'Нет подтверждённых данных'
        : issue
          ? schedule.error
            ? 'Данные недоступны'
            : schedule.loading
              ? 'Загружаем…'
              : 'Нет данных'
          : schedule.snapshot?.stale || schedule.error
            ? 'Сохранено'
            : '';
  };
  const choices = schedules.map((schedule) => ({
    value: scheduleKey(schedule.selection),
    label: `${label(schedule.selection)} · ${kindLabel(selectionKind(schedule.selection))}${hiddenKinds.includes(selectionKind(schedule.selection)) ? ' · скрыто' : status(schedule) ? ` · ${status(schedule)}` : ''}`,
  }));
  function jump(key: string) {
    const schedule = schedules.find(
      (schedule) => scheduleKey(schedule.selection) === key,
    );
    const track = tracksRef.current.find((track) => track.key === key);
    if (!schedule) return;
    setJumped(key);
    if (!track) return;
    const viewport = scroller.current;
    if (!viewport) return;
    viewport.scrollLeft = track.left - SOURCE_INSET;
    syncScroll();
    const band = Array.from(
      viewport.querySelectorAll<HTMLElement>('[data-source-key]'),
    ).find((element) => element.dataset.sourceKey === key);
    const target = band?.querySelector<HTMLElement>('button') ?? band;
    if (target) requestAnimationFrame(() => reveal(target));
    return target;
  }
  function reveal(target: HTMLElement) {
    const viewport = scroller.current;
    if (!viewport || !target.isConnected) return;
    const card = target.matches('.lesson-card');
    let box = target.getBoundingClientRect();
    const bounds = viewport.getBoundingClientRect();
    if (box.left < bounds.left + rail + SOURCE_INSET)
      viewport.scrollLeft += box.left - bounds.left - rail - SOURCE_INSET;
    else if (box.right > bounds.right - SOURCE_INSET)
      viewport.scrollLeft += box.right - bounds.right + SOURCE_INSET;
    syncScroll();
    box = target.getBoundingClientRect();
    const headerBottom = Math.max(
      0,
      header.current?.parentElement?.getBoundingClientRect().bottom ?? 0,
    );
    if (
      box.top < headerBottom + 8 ||
      (card ? box.bottom : box.top + 32) > window.innerHeight - 8
    )
      window.scrollBy({ top: box.top - headerBottom - 8, behavior: 'instant' });
  }

  const hours = Array.from(
    { length: (end - start) / 60 + 1 },
    (_, i) => start + i * 60,
  );
  return (
    <section
      className="source-day-calendar min-w-0"
      style={{ '--source-inset': `${SOURCE_INSET}px` } as CSSProperties}
      aria-label={`Расписания по дорожкам на ${formatDay(day, { day: 'numeric', month: 'long' })}`}
      aria-busy={loading}
    >
      <div className="source-header sticky top-0 z-[7] overflow-hidden border-y border-u-line-soft bg-u-surface">
        <div className="border-b border-u-line-soft px-2 py-1">
          <Select.Root
            value={null}
            disabled={placeholder}
            items={choices}
            onValueChange={(value) => {
              pendingJump.current = value;
            }}
          >
            <Select.Trigger
              className="source-jump min-h-11 w-full max-w-[360px] text-sm"
              aria-label={`Перейти к расписанию (${schedules.length})`}
            >
              <Select.Value placeholder="К расписанию" />
              <span className="ml-auto text-xs text-u-muted" aria-hidden="true">
                {schedules.length}
              </span>
            </Select.Trigger>
            <Select.Content
              className="source-jump-options max-h-[min(320px,var(--available-height))] w-[min(360px,calc(100vw-32px))] [&_.u-select-item]:min-h-11 [&_.u-select-item]:whitespace-normal [&_.u-select-item]:wrap-anywhere"
              finalFocus={() => {
                const key = pendingJump.current;
                pendingJump.current = null;
                return key ? (jump(key) ?? true) : true;
              }}
            >
              {choices.map((choice) => (
                <Select.Item key={choice.value} value={choice.value}>
                  {choice.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div
          ref={header}
          className="relative grid min-h-[56px]"
          style={{
            width,
            gridTemplateColumns: `${rail + SOURCE_INSET}px ${tracks
              .flatMap((track, index) => [
                track.width,
                (tracks[index + 1]?.left ??
                  track.left + track.width + SOURCE_INSET) -
                  track.left -
                  track.width,
              ])
              .map((size) => `${size}px`)
              .join(' ')}`,
          }}
          aria-hidden={placeholder || undefined}
        >
          {tracks.map((track, index) => {
            const schedule = visible.find(
              (schedule) => scheduleKey(schedule.selection) === track.key,
            )!;
            const kind = selectionKind(track.selection);
            const muted =
              spotlightIds.length > 0 && !spotlightIds.includes(track.key);
            return (
              <div
                key={track.key}
                className={`source-label flex min-h-[56px] flex-col justify-center gap-1 border-b-[3px] px-1.5 py-1 ${jumped === track.key ? 'bg-u-selection' : 'bg-u-surface'}`}
                style={{
                  gridColumn: 2 + index * 2,
                  gridRow: 1,
                  borderColor: lessonColor(colors[track.key] ?? 0, muted),
                }}
              >
                <strong className="text-xs leading-4 wrap-anywhere">
                  {label(track.selection)}
                </strong>
                <span className="flex min-w-0 items-center gap-1 text-[10px] leading-3 text-u-muted">
                  <Icon name={kindIcon(kind)} size={11} />
                  {kindLabel(kind)}
                  {status(schedule) && <span> · {status(schedule)}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {notice && (
        <p className="m-0 px-3 py-2 text-xs text-u-muted" role="status">
          {notice}
        </p>
      )}
      <div
        ref={scroller}
        onScroll={syncScroll}
        onFocusCapture={(event) => {
          const target = event.target;
          if (
            !(target instanceof HTMLElement) ||
            !target.matches('.lesson-card')
          )
            return;
          requestAnimationFrame(() => {
            if (document.activeElement === target) reveal(target);
          });
        }}
        className="source-scroll relative overflow-x-auto overflow-y-hidden overscroll-x-contain [overflow-anchor:none]"
        role="region"
        tabIndex={0}
        aria-label="Дорожки расписаний"
        style={
          {
            '--hour-height': `${60 * scale}px`,
            scrollPaddingLeft: rail + SOURCE_INSET,
          } as CSSProperties
        }
      >
        <div className="relative" style={{ width, height }}>
          <div className="time-rail sticky left-0 z-[5] h-full w-11 border-r border-u-line-soft bg-u-surface">
            {hours.map((hour) => (
              <span
                key={hour}
                className="absolute right-1 -translate-y-1/2 text-[10px] leading-none first:translate-y-0.5 last:-translate-y-full"
                style={{ top: (hour - start) * scale }}
              >
                {timeLabel(hour)}
              </span>
            ))}
          </div>
          {tracks.map((track) => {
            const schedule = visible.find(
              (schedule) => scheduleKey(schedule.selection) === track.key,
            )!;
            return (
              <div
                key={track.key}
                data-source-key={track.key}
                data-lesson-region
                tabIndex={-1}
                role="group"
                aria-label={`${label(track.selection)} · ${kindLabel(selectionKind(track.selection))}`}
                className="source-band absolute top-0 bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_calc(var(--hour-height)-1px),var(--u-line-soft)_calc(var(--hour-height)-1px),var(--u-line-soft)_var(--hour-height))] focus-visible:outline-2 focus-visible:outline-u-ink [&_.presence-highlight]:left-[calc(-1*var(--source-inset))]"
                style={{ left: rail + track.left, width: track.width, height }}
              >
                {includedKeys.has(track.key) && (
                  <ComparisonHighlights
                    result={result}
                    layers={layers}
                    saved={saved}
                    start={start}
                    scale={scale}
                    outside
                  />
                )}
                {loading && !hasSnapshot ? (
                  <Skeleton className="mt-14 h-20 w-full" />
                ) : (
                  track.occurrences.map(
                    ({
                      block,
                      top,
                      height: cardHeight,
                      column,
                      member,
                      reference,
                    }) => (
                      <LessonCard
                        key={JSON.stringify([block.identity, track.key])}
                        block={block}
                        trackMember={member}
                        reference={reference}
                        colors={colors}
                        subgroupCatalog={subgroupCatalog}
                        spotlightIds={spotlightIds}
                        hiddenKinds={hiddenKinds}
                        style={{
                          top,
                          height: cardHeight,
                          left: column * VERTICAL_LANE_PITCH,
                          width: VERTICAL_CARD_WIDTH,
                        }}
                      />
                    ),
                  )
                )}
                {!track.occurrences.length && !(loading && !hasSnapshot) && (
                  <p className="absolute inset-x-0 top-24 px-2 text-center text-xs leading-5 text-u-muted">
                    {status(schedule) || 'Нет занятий'}
                    {!comparisonIssue(schedule, day) &&
                      (schedule.snapshot?.stale || schedule.error) &&
                      ' · нет занятий'}
                  </p>
                )}
              </div>
            );
          })}
          {tracks.length === 0 &&
            (placeholder ? (
              <div className="absolute top-12 right-4 left-14" role="status">
                <Skeleton className="h-20 w-40" />
                <span className="sr-only">Открываем расписания…</span>
              </div>
            ) : (
              <p className="absolute top-12 right-4 left-14 text-sm text-u-muted">
                Карточки выбранных видов скрыты.
              </p>
            ))}
        </div>
      </div>
      {scope.included.length >= 2 && (layers.presence || layers.free) && (
        <p className="calendar-hint m-0 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-u-line-soft px-3 py-2 text-[11px] leading-4 text-u-muted">
          {layers.presence && (
            <span
              className={`inline-flex items-center gap-1.5 before:h-2.5 before:w-1 before:border-l-[3px] before:border-campus-presence-border before:content-[''] ${saved ? 'before:border-dashed' : ''}`}
            >
              В вузе
            </span>
          )}
          {layers.free && (
            <span
              className={`inline-flex items-center gap-1.5 before:h-2.5 before:w-2.5 before:border before:border-u-accent-border before:bg-u-accent-soft before:content-[''] ${saved ? 'before:border-dashed' : ''}`}
            >
              Общие окна
            </span>
          )}
        </p>
      )}
    </section>
  );
}
