import { Card } from 'unlikely-ui/card';
import { Skeleton } from 'unlikely-ui/skeleton';
import type { GroupSchedule, Mode, ScheduleKind } from '../../../lib/types.ts';
import { formatDay, timeLabel } from '../../../lib/dates.ts';
import {
  compareDay,
  comparisonScope,
  lessonsFor,
} from '../../../lib/domain.ts';
import {
  participates,
  isGroup,
  selectionKind,
} from '../../../lib/schedule-ref.ts';
import { selectionLabel } from '../../../lib/subgroups.ts';

interface ComparisonSummaryProps {
  schedules: GroupSchedule[];
  hiddenKinds?: ScheduleKind[];
  day: string;
  loading: boolean;
  mode: Mode;
  compact?: boolean;
  placeholder?: boolean;
}

export default function ComparisonSummary({
  schedules,
  hiddenKinds = [],
  day,
  loading,
  mode,
  compact = false,
  placeholder = false,
}: ComparisonSummaryProps) {
  const result = compareDay(schedules, day);
  const { included, excluded, overlays } = comparisonScope(schedules, day);
  const eligible = schedules.filter((schedule) =>
    participates(schedule.selection),
  );
  const mixed = schedules.some((schedule) => !isGroup(schedule.selection));
  const teachers = schedules.some(
    (schedule) => selectionKind(schedule.selection) === 'lecturer',
  );
  const showScope = mixed || hiddenKinds.length > 0 || excluded.length > 0;
  const comparing = included.length >= 2;
  const hasLessons = included.some((group) =>
    lessonsFor(group).some((lesson) => lesson.date === day),
  );
  const saved = included.some(
    (group) => group.snapshot && (group.snapshot.stale || group.error),
  );
  const hasSnapshot = schedules.some((group) => group.snapshot);
  const withoutOnsite = included
    .filter(
      (group) =>
        !lessonsFor(group).some(
          (lesson) => lesson.date === day && !lesson.remote,
        ),
    )
    .map((group) => selectionLabel(group.selection));
  const times = (intervals: typeof result.presence) =>
    intervals
      .map(
        (interval) => `${timeLabel(interval.start)}–${timeLabel(interval.end)}`,
      )
      .join(', ');
  return (
    <Card.Root
      className={`marvin-card grid text-u-ink ${compact ? 'compact-summary w-full grid-cols-1 gap-0 rounded-none border-0 bg-transparent p-0' : 'gap-x-3 gap-y-2 rounded-[var(--u-panel-radius)] border border-u-line bg-u-raised shadow-[var(--u-shadow-md)] dark:bg-[color-mix(in_srgb,var(--u-surface-raised)_88%,var(--u-ink))] min-h-[182px] w-[340px] shrink-0 grid-cols-[112px_minmax(0,1fr)] grid-rows-[auto_auto] content-start items-start p-4 max-[1100px]:w-[300px] max-[1100px]:grid-cols-[96px_minmax(0,1fr)] max-[1100px]:p-3.5'}`}
      role="complementary"
      aria-label="Результат сравнения"
      aria-busy={loading}
    >
      {!compact && (
        <img
          className="size-28 object-contain max-[1100px]:size-24"
          src="/assets/mascot-m2-thinking-v1.webp"
          width="150"
          height="150"
          alt="Робот задумался над расписанием"
        />
      )}
      <div className="marvin-result relative min-w-0 self-start text-xs leading-snug [overflow-wrap:anywhere] [&>strong]:text-[13px] [&>strong]:font-bold [&>p]:my-1">
        <div
          className={`summary-date mb-2 text-[10px] font-semibold capitalize ${compact ? 'hidden' : ''}`}
        >
          {placeholder ? (
            <Skeleton className="inline-block h-3 w-[75px] align-middle" />
          ) : (
            formatDay(day, { weekday: 'short', day: 'numeric', month: 'short' })
          )}
        </div>
        {showScope && (!loading || hasSnapshot) && (
          <div
            className="comparison-scope mb-2 text-xs leading-snug"
            role="status"
          >
            <strong>
              {comparing
                ? excluded.length
                  ? `Частичное сравнение · ${included.length} из ${eligible.length}`
                  : 'В расчёте'
                : `Для расчёта: ${included.length} из ${eligible.length}`}
            </strong>
            {!!included.length && (
              <p className="my-1">
                Учтены:{' '}
                {included
                  .map((group) => selectionLabel(group.selection))
                  .join(' + ')}
              </p>
            )}
            {!!excluded.length && (
              <p className="my-1">
                Не учтены:{' '}
                {excluded
                  .map((group) => selectionLabel(group.selection))
                  .join(', ')}
              </p>
            )}
            {!!overlays.length && (
              <p className="my-1 text-u-muted">
                Аудитории не участвуют в расчёте:{' '}
                {overlays
                  .map((schedule) => schedule.selection.label)
                  .join(', ')}
                .
              </p>
            )}
          </div>
        )}
        {loading && !hasSnapshot ? (
          <>
            <div
              className="grid gap-3 [&>div]:h-4 [&>div:last-child]:w-[65%]"
              aria-hidden="true"
            >
              <Skeleton />
              <Skeleton />
            </div>
            <span className="sr-only">Загружаем результат сравнения.</span>
          </>
        ) : eligible.length === 0 ? (
          <>
            <strong>Занятость аудиторий</strong>
            <p>
              По учебному расписанию. Фактическую доступность нужно уточнять.
            </p>
          </>
        ) : eligible.length < 2 && !excluded.length ? (
          <strong>{teachers ? 'Учебные занятия' : 'Твоё расписание'}</strong>
        ) : !comparing ? (
          <>
            <strong>Совместный результат недоступен</strong>
            <p>
              Для сравнения нужны хотя бы два доступных расписания групп,
              преподавателей или взводов.
            </p>
          </>
        ) : !hasLessons ? (
          <>
            <strong>
              {excluded.length || overlays.length
                ? 'У учтённых участников на этот день занятий нет.'
                : 'На этот день занятий нет.'}
            </strong>
            <p>Выбери другой день — проверим общее время.</p>
          </>
        ) : compact ? (
          <>
            {(mode === 'free'
              ? (['free', 'presence'] as const)
              : (['presence', 'free'] as const)
            ).map((layer) => (
              <p key={layer} className="result-time text-xs leading-relaxed">
                <span className="text-u-muted">
                  {layer === 'presence' ? 'В вузе' : 'Без занятий'}:{' '}
                </span>
                <strong className="font-semibold">
                  {result[layer].length
                    ? times(result[layer])
                    : layer === 'presence'
                      ? 'Нет общего времени'
                      : 'Общих окон нет'}
                </strong>
              </p>
            ))}
          </>
        ) : (
          <>
            <strong>Общее время в вузе:</strong>
            <p className="result-time text-base leading-snug font-extrabold tracking-[-0.3px]">
              {result.presence.length
                ? times(result.presence)
                : 'Нет общего времени'}
            </p>
            <strong>Общий перерыв в вузе:</strong>
            <p className="result-time text-base leading-snug font-extrabold tracking-[-0.3px]">
              {result.free.length
                ? times(result.free)
                : 'Общего перерыва в вузе нет'}
            </p>
            {!!result.lessons.length && (
              <span className="shared-count">
                Общих занятий: {result.lessons.length}
              </span>
            )}
          </>
        )}
        {comparing && hasLessons && !result.presence.length && (
          <p className="presence-reason text-xs leading-snug text-u-ink">
            {withoutOnsite.length === 1
              ? `У ${withoutOnsite[0]} в этот день нет очных занятий.`
              : withoutOnsite.length
                ? `В этот день нет очных занятий у ${withoutOnsite.length} выбранных расписаний.`
                : 'Время занятий выбранных участников в вузе не пересекается.'}
          </p>
        )}
        {teachers && (
          <p className="mt-2 text-[11px] text-u-muted">
            Для преподавателей учтены только учебные занятия.
          </p>
        )}
        {(!compact || saved) && (
          <p className="saved-qualification mt-[5px] text-[11px] text-u-ink">
            {saved
              ? 'По сохранённым данным'
              : comparing
                ? 'По расписанию'
                : '\u00a0'}
          </p>
        )}
      </div>
      {!compact && (
        <p className="col-span-full m-0 border-t border-u-line pt-1.5 text-right text-[10px] leading-3 text-u-ink">
          {result.free.length
            ? 'Даже у вселенной бывают окна.'
            : 'Время — иллюзия. Расписание — чуть сложнее.'}
        </p>
      )}
    </Card.Root>
  );
}
