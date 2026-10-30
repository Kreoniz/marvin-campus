import type { CSSProperties } from 'react';
import { Skeleton } from 'unlikely-ui/skeleton';
import { agendaIntervals, dayAgenda } from '../../../lib/agenda.ts';
import { comparisonIssue, comparisonScope } from '../../../lib/domain.ts';
import { formatDay, timeLabel } from '../../../lib/dates.ts';
import { lessonGroupLabel } from '../../../lib/subgroups.ts';
import { lessonColor, type GroupColors } from '../../../lib/colors.ts';
import type { GroupSchedule, Subgroup } from '../../../lib/types.ts';
import Icon from '../../../shared/ui/Icon.tsx';
import { participantClasses } from './participant-style.ts';

interface Props {
  schedules: GroupSchedule[];
  day: string;
  colors: GroupColors;
  subgroupCatalog: Record<number, Subgroup[]>;
  loading: boolean;
  placeholder?: boolean;
  spotlightIds?: number[];
}

export default function DayAgenda({
  schedules,
  day,
  colors,
  subgroupCatalog,
  loading,
  placeholder = false,
  spotlightIds = [],
}: Props) {
  const entries = dayAgenda(schedules, day);
  const { excluded } = comparisonScope(schedules);
  const saved = schedules.some(
    (group) => group.snapshot && (group.snapshot.stale || group.error),
  );
  return (
    <section
      className="day-agenda px-3 py-3 compact:px-4"
      aria-label={`Список занятий на ${formatDay(day, { day: 'numeric', month: 'long' })}`}
      aria-busy={loading}
    >
      {placeholder ||
      (loading && !schedules.some((group) => group.snapshot)) ? (
        <div className="grid gap-3" aria-label="Загружаем занятия">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-22 w-full" />
          ))}
        </div>
      ) : entries.length ? (
        <ol className="m-0 grid list-none gap-4 p-0">
          {agendaIntervals(entries).map((interval) => (
            <li
              key={`${interval.start}:${interval.end}`}
              className="agenda-interval"
            >
              <h3 className="mt-0 mb-2 flex items-baseline gap-2 text-xs font-bold tabular-nums">
                <span>
                  <time>{timeLabel(interval.start)}</time>–
                  <time>{timeLabel(interval.end)}</time>
                </span>
                {interval.entries.length > 1 && (
                  <span className="text-[11px] font-normal text-u-muted">
                    Параллельно · {interval.entries.length}
                  </span>
                )}
              </h3>
              <ol className="m-0 list-none overflow-hidden rounded-u-control border border-u-line p-0">
                {interval.entries.map((entry) => {
                  const { lesson, members, staleMembers } = entry;
                  const spotlights = members.filter((member) =>
                    spotlightIds.includes(member.id),
                  );
                  const spotlight = spotlights.length > 0;
                  const dimmed = spotlightIds.length > 0 && !spotlight;
                  return (
                    <li
                      key={entry.identity}
                      className="agenda-entry border-t border-u-line-soft first:border-t-0"
                      data-agenda-id={entry.identity}
                      data-spotlight={spotlight ? '' : undefined}
                      data-dimmed={dimmed ? '' : undefined}
                    >
                      <article
                        className={`min-w-0 p-3 ${dimmed ? 'bg-u-surface text-u-muted' : 'bg-u-raised'} ${lesson.remote ? 'remote-lesson border-2 border-dashed border-u-muted' : ''}`}
                      >
                        {spotlight && (
                          <span className="sr-only">
                            Подсветка:{' '}
                            {spotlights
                              .map((member) => member.label)
                              .join(', ')}
                            .
                          </span>
                        )}
                        <h4 className="m-0 text-sm leading-snug font-bold wrap-anywhere">
                          {lesson.subject || 'Занятие'}
                        </h4>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {members.map((member) => {
                            const memberDimmed =
                              spotlightIds.length > 0 &&
                              !spotlightIds.includes(member.id);
                            return (
                              <span
                                key={member.id}
                                data-member-id={member.id}
                                data-dimmed={memberDimmed ? '' : undefined}
                                data-spotlight={
                                  spotlightIds.includes(member.id)
                                    ? ''
                                    : undefined
                                }
                                className={`inline-flex items-center gap-1 rounded-[3px] px-1 py-0.5 text-[11px] leading-tight ${participantClasses(staleMembers.includes(member.id), memberDimmed)}`}
                                style={
                                  {
                                    '--chip': lessonColor(
                                      colors[member.id] ?? 0,
                                      memberDimmed,
                                    ),
                                  } as CSSProperties
                                }
                              >
                                {spotlightIds.includes(member.id) && (
                                  <Icon name="tick" size={10} />
                                )}
                                {lessonGroupLabel(
                                  member,
                                  entry.memberLessons[member.id],
                                  subgroupCatalog[member.id] ?? [],
                                )}
                                {staleMembers.includes(member.id) && (
                                  <>
                                    <Icon name="clock" size={11} />
                                    <span className="sr-only">
                                      {' '}
                                      — сохранённые данные
                                    </span>
                                  </>
                                )}
                              </span>
                            );
                          })}
                        </div>
                        <p className="mt-1.5 mb-0 text-xs leading-relaxed text-u-muted wrap-anywhere">
                          {lesson.remote
                            ? 'Онлайн'
                            : lesson.room || 'Аудитория не указана'}{' '}
                          · {lesson.kind || 'Тип занятия не указан'}
                          {lesson.teacher && (
                            <span className="agenda-teacher">
                              {' '}
                              · {lesson.teacher}
                            </span>
                          )}
                        </p>
                      </article>
                    </li>
                  );
                })}
              </ol>
            </li>
          ))}
        </ol>
      ) : (
        <p className="my-5 text-sm text-u-muted" role="status">
          {excluded.length
            ? schedules.some((group) => comparisonIssue(group) === 'subgroup')
              ? 'Подгруппа не определена; данные дня неполные.'
              : schedules.some((group) => group.error && !group.snapshot)
                ? 'Данные расписания недоступны.'
                : 'Ждём данные расписания.'
            : 'В этот день занятий нет.'}
          {saved && (
            <span className="mt-1 block text-xs">По сохранённым данным</span>
          )}
        </p>
      )}
    </section>
  );
}
