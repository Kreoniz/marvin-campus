import type { CSSProperties } from 'react';
import { Card } from 'unlikely-ui/card';
import { Skeleton } from 'unlikely-ui/skeleton';
import { ScrollArea } from 'unlikely-ui/scroll-area';
import type {
  GroupSchedule,
  Mode,
  Subgroup,
  ScheduleKind,
} from '../../../lib/types.ts';
import { selectionKind } from '../../../lib/schedule-ref.ts';
import { formatDay, timeLabel } from '../../../lib/dates.ts';
import {
  compareDay,
  comparisonIssue,
  comparisonScope,
} from '../../../lib/domain.ts';
import { lessonBlocks } from '../../../lib/lesson-layout.ts';
import type { GroupColors } from '../../../lib/colors.ts';
import LessonCard from '../../schedule/ui/LessonCard.tsx';
import ComparisonSummary from './ComparisonSummary.tsx';
import AutoHideScrollArea from '../../../shared/ui/AutoHideScrollArea.tsx';
import { Button } from 'unlikely-ui/button';
import { RadioGroup } from 'unlikely-ui/radio-group';
import DayAgenda from '../../schedule/ui/DayAgenda.tsx';
import ComparisonHighlights, {
  type CalendarLayers,
} from '../../schedule/ui/ComparisonHighlights.tsx';

interface DayDetailProps {
  schedules: GroupSchedule[];
  hiddenKinds?: ScheduleKind[];
  colors: GroupColors;
  subgroupCatalog?: Record<number, Subgroup[]>;
  day: string;
  mode: Mode;
  layers: CalendarLayers;
  loading: boolean;
  placeholder?: boolean;
  dayFormat: 'timeline' | 'list';
  onDayFormat: (format: 'timeline' | 'list') => void;
  spotlightIds: string[];
  spotlightLabel?: string;
  onClearSpotlight: () => void;
}

export default function DayDetail({
  schedules,
  hiddenKinds = [],
  colors,
  subgroupCatalog = {},
  day,
  mode,
  layers,
  loading,
  placeholder = false,
  dayFormat,
  onDayFormat,
  spotlightIds,
  spotlightLabel,
  onClearSpotlight,
}: DayDetailProps) {
  const result = compareDay(schedules, day);
  const { included } = comparisonScope(schedules, day);
  const saved = included.some(
    (group) => group.snapshot && (group.snapshot.stale || group.error),
  );
  const placed = lessonBlocks(schedules, day).filter((block) =>
    block.members.some(
      (member) => !hiddenKinds.includes(selectionKind(member)),
    ),
  );
  const all = schedules.flatMap((group) => group.snapshot?.data.lessons ?? []);
  const start = Math.min(
    480,
    ...all.map((lesson) => Math.floor(lesson.start / 60) * 60),
  );
  const end = Math.max(
    1140,
    ...all.map((lesson) => Math.ceil(lesson.end / 60) * 60),
  );
  const hours = Array.from(
    { length: (end - start) / 60 + 1 },
    (_, i) => start + i * 60,
  );
  const rows = Math.max(1, ...placed.map((block) => block.columns));
  const weekRows = Math.max(
    1,
    ...[...new Set(all.map((lesson) => lesson.date))].flatMap((date) =>
      lessonBlocks(schedules, date)
        .filter((block) =>
          block.members.some(
            (member) => !hiddenKinds.includes(selectionKind(member)),
          ),
        )
        .map((block) => block.columns),
    ),
  );
  const rowHeight = 68;
  const panelHeight =
    dayFormat === 'list'
      ? 400
      : Math.max(252, Math.min(496, weekRows * rowHeight + 104));
  return (
    <Card.Root
      className="day-detail mt-[17px] flex h-[var(--detail-height)] gap-3.5 p-3 [overflow-anchor:none] [&>.marvin-card]:min-h-0 [&>.marvin-card]:overflow-y-auto [&>.marvin-card]:[scrollbar-gutter:stable]"
      role="region"
      aria-busy={loading}
      aria-labelledby="day-title"
      style={{ '--detail-height': `${panelHeight}px` } as CSSProperties}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-1 flex min-h-9 flex-wrap items-center gap-2">
          <h2
            id="day-title"
            className="m-0 min-w-0 flex-1 truncate text-sm leading-6 font-bold first-letter:uppercase"
          >
            {placeholder ? (
              <>
                <Skeleton className="inline-block h-5 w-[min(220px,100%)] align-middle" />
                <span className="sr-only">Загружаем выбранный день</span>
              </>
            ) : (
              formatDay(day, { weekday: 'long', day: 'numeric', month: 'long' })
            )}
          </h2>
          {spotlightLabel && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={onClearSpotlight}
              aria-label={`Снять подсветку ${spotlightLabel}`}
            >
              Снять подсветку
            </Button>
          )}
          <RadioGroup.Root
            variant="segmented"
            className="shrink-0 gap-0 p-0.5 [&_.u-segmented-item]:min-h-8 [&_.u-segmented-item]:px-2 [&_.u-segmented-item]:text-xs"
            value={dayFormat}
            aria-label="Представление выбранного дня"
            onValueChange={(value) => {
              if (value === 'list' || value === 'timeline') onDayFormat(value);
            }}
          >
            <RadioGroup.Item value="timeline">Шкала</RadioGroup.Item>
            <RadioGroup.Item value="list">Список</RadioGroup.Item>
          </RadioGroup.Root>
        </div>
        {dayFormat === 'list' ? (
          <div
            className="min-h-0 flex-1 overflow-y-auto"
            tabIndex={0}
            role="region"
            aria-label="Прокрутка списка дня"
          >
            <DayAgenda
              schedules={schedules}
              day={day}
              colors={colors}
              subgroupCatalog={subgroupCatalog}
              loading={loading}
              placeholder={placeholder}
              spotlightIds={spotlightIds}
              hiddenKinds={hiddenKinds}
            />
          </div>
        ) : (
          <AutoHideScrollArea className="min-h-0 flex-1">
            <ScrollArea.Viewport
              className="day-scroll"
              tabIndex={0}
              role="region"
              aria-label="Подробное расписание выбранного дня"
            >
              <ScrollArea.Content className="pl-4">
                <div
                  className="day-timeline relative min-w-[740px] max-w-[1080px] bg-[repeating-linear-gradient(to_right,transparent,transparent_calc(100%/var(--day-divisions)-1px),var(--u-line-soft)_calc(100%/var(--day-divisions)-1px),var(--u-line-soft)_calc(100%/var(--day-divisions)))]"
                  style={
                    {
                      height: rows * rowHeight + 40,
                      '--day-divisions': (end - start) / 30,
                    } as CSSProperties
                  }
                >
                  {hours.map((hour) => (
                    <span
                      key={hour}
                      className="absolute top-px z-[1] -translate-x-1/2 bg-u-surface text-[11px]"
                      style={{
                        left: `${((hour - start) * 100) / (end - start)}%`,
                      }}
                    >
                      {timeLabel(hour)}
                    </span>
                  ))}
                  {loading && !schedules.some((group) => group.snapshot) ? (
                    <div
                      className="absolute inset-0 [&>div]:absolute"
                      aria-hidden="true"
                    >
                      {Array.from({ length: rows }, (_, index) => (
                        <Skeleton
                          key={index}
                          style={{
                            top: index * rowHeight + 36,
                            left: '8%',
                            width: '72%',
                            height: rowHeight - 6,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <>
                      <ComparisonHighlights
                        result={result}
                        layers={layers}
                        saved={saved}
                        start={start}
                        end={end}
                      />
                      {placed.map((block) => (
                        <LessonCard
                          key={block.identity}
                          block={block}
                          colors={colors}
                          subgroupCatalog={subgroupCatalog}
                          horizontal
                          spotlightIds={spotlightIds}
                          hiddenKinds={hiddenKinds}
                          style={{
                            left: `calc(${((block.lesson.start - start) * 100) / (end - start)}% + 2px)`,
                            width: `calc(${((block.lesson.end - block.lesson.start) * 100) / (end - start)}% - 4px)`,
                            top: block.column * rowHeight + 36,
                            height: rowHeight - 6,
                          }}
                        />
                      ))}
                      {!placed.length && (
                        <p className="absolute top-[45px] left-3 text-[13px] text-u-muted [&>span]:mt-[5px] [&>span]:block [&>span]:text-[11px]">
                          {schedules.length > 0 &&
                          schedules.every((group) =>
                            hiddenKinds.includes(
                              selectionKind(group.selection),
                            ),
                          )
                            ? 'Карточки скрыты в настройках отображения.'
                            : schedules.some(
                                  (group) =>
                                    comparisonIssue(group, day) === 'coverage',
                                )
                              ? 'Нет подтверждённых данных документа на этот день.'
                              : schedules.some(
                                    (group) =>
                                      comparisonIssue(group, day) ===
                                      'subgroup',
                                  )
                                ? 'Подгруппа не определена; сравнение ограничено.'
                                : schedules.some(
                                      (group) => group.error && !group.snapshot,
                                    )
                                  ? 'Часть расписаний недоступна.'
                                  : schedules.some((group) => !group.snapshot)
                                    ? 'Ждём данные расписания.'
                                    : 'В этот день занятий нет.'}
                          {saved &&
                            schedules.every((group) => group.snapshot) && (
                              <span>По сохранённым данным</span>
                            )}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar className="z-[2]" />
            <ScrollArea.Scrollbar orientation="horizontal" className="z-[2]" />
            <ScrollArea.Corner />
          </AutoHideScrollArea>
        )}
      </div>
      <ComparisonSummary
        schedules={schedules}
        hiddenKinds={hiddenKinds}
        day={day}
        mode={mode}
        loading={loading}
        placeholder={placeholder}
      />
    </Card.Root>
  );
}
