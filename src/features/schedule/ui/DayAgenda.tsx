import type { CSSProperties } from 'react';
import { Skeleton } from 'unlikely-ui/skeleton';
import { agendaIntervals, dayAgenda } from '../../../lib/agenda.ts';
import { comparisonIssue, comparisonScope } from '../../../lib/domain.ts';
import { formatDay, timeLabel } from '../../../lib/dates.ts';
import { lessonGroupLabel } from '../../../lib/subgroups.ts';
import { lessonColor, type GroupColors } from '../../../lib/colors.ts';
import type {
  GroupSchedule,
  Subgroup,
  ScheduleKind,
} from '../../../lib/types.ts';
import Icon from '../../../shared/ui/Icon.tsx';
import {
  scheduleKey,
  selectionKind,
  isGroup,
  kindLabel,
  kindIcon,
} from '../../../lib/schedule-ref.ts';
import { participantClasses } from './participant-style.ts';
import {
  LessonRoom,
  LessonTeachers,
  LessonTeacherSources,
} from '../../resources/LessonResources.tsx';
import LessonDocument from '../../resources/LessonDocument.tsx';
import { scheduleLabels } from '../../../lib/selection-labels.ts';
import MilitaryPreview from '../../resources/MilitaryPreview.tsx';

interface Props {
  schedules: GroupSchedule[];
  day: string;
  colors: GroupColors;
  subgroupCatalog: Record<number, Subgroup[]>;
  loading: boolean;
  placeholder?: boolean;
  spotlightIds?: string[];
  hiddenKinds?: ScheduleKind[];
}

export default function DayAgenda({
  schedules,
  day,
  colors,
  subgroupCatalog,
  loading,
  placeholder = false,
  spotlightIds = [],
  hiddenKinds = [],
}: Props) {
  const label = scheduleLabels(schedules);
  const order = new Map(
    schedules.map((row, index) => [scheduleKey(row.selection), index]),
  );
  const entries = dayAgenda(schedules, day)
    .map((entry) => ({
      ...entry,
      members: entry.members
        .slice()
        .sort(
          (a, b) =>
            (order.get(scheduleKey(a)) ?? Infinity) -
            (order.get(scheduleKey(b)) ?? Infinity),
        ),
    }))
    .filter((entry) =>
      entry.members.some(
        (member) => !hiddenKinds.includes(selectionKind(member)),
      ),
    );
  const { excluded } = comparisonScope(schedules, day);
  const missing = schedules.filter((schedule) =>
    comparisonIssue(schedule, day),
  );
  const allHidden =
    schedules.length > 0 &&
    schedules.every((schedule) =>
      hiddenKinds.includes(selectionKind(schedule.selection)),
    );
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
                  const { lesson, staleMembers } = entry;
                  const members = entry.members.filter(
                    (member) => !hiddenKinds.includes(selectionKind(member)),
                  );
                  const spotlights = members.filter((member) =>
                    spotlightIds.includes(scheduleKey(member)),
                  );
                  const spotlight = spotlights.length > 0;
                  const dimmed = spotlightIds.length > 0 && !spotlight;
                  return (
                    <li
                      key={entry.identity}
                      className="agenda-entry border-t border-u-line-soft first:border-t-0 motion-safe:animate-lesson-appear"
                      data-agenda-id={entry.identity}
                      data-spotlight={spotlight ? '' : undefined}
                      data-dimmed={dimmed ? '' : undefined}
                    >
                      <article
                        data-resource-kind={
                          members.length === 1
                            ? selectionKind(members[0])
                            : undefined
                        }
                        style={
                          members.length === 1
                            ? ({
                                '--chip': lessonColor(
                                  colors[scheduleKey(members[0])] ?? 0,
                                  dimmed,
                                ),
                              } as CSSProperties)
                            : undefined
                        }
                        className={`relative min-w-0 p-3 ${members.length === 1 && ['lecturer', 'auditorium'].includes(selectionKind(members[0])) ? `resource-card resource-${selectionKind(members[0])}` : ''} motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out ${dimmed ? 'bg-u-surface text-u-muted' : 'bg-u-raised'} ${lesson.remote ? 'remote-lesson border-2 border-dashed border-u-muted' : ''}`}
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
                              !spotlightIds.includes(scheduleKey(member));
                            return (
                              <span
                                key={scheduleKey(member)}
                                data-member-id={scheduleKey(member)}
                                data-dimmed={memberDimmed ? '' : undefined}
                                data-spotlight={
                                  spotlightIds.includes(scheduleKey(member))
                                    ? ''
                                    : undefined
                                }
                                className={`inline-flex items-center gap-1 rounded-[3px] px-1 py-0.5 text-xs leading-snug ${participantClasses(staleMembers.includes(scheduleKey(member)), memberDimmed)}`}
                                style={
                                  {
                                    '--chip': lessonColor(
                                      colors[scheduleKey(member)] ?? 0,
                                      memberDimmed,
                                    ),
                                  } as CSSProperties
                                }
                              >
                                {!isGroup(member) &&
                                  selectionKind(member) !== 'vuc' && (
                                    <>
                                      <Icon
                                        name={kindIcon(selectionKind(member))}
                                        size={12}
                                      />
                                      {kindLabel(selectionKind(member))}:{' '}
                                    </>
                                  )}
                                {spotlightIds.includes(scheduleKey(member)) && (
                                  <Icon name="tick" size={10} />
                                )}
                                {member.kind === 'vuc'
                                  ? label(member)
                                  : lessonGroupLabel(
                                      member,
                                      entry.memberLessons[scheduleKey(member)],
                                      isGroup(member)
                                        ? (subgroupCatalog[member.id] ?? [])
                                        : [],
                                    )}
                                {staleMembers.includes(scheduleKey(member)) && (
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
                        {(lesson.audiences?.length || lesson.audience) && (
                          <p className="mt-1.5 mb-0 text-[13px] leading-snug wrap-anywhere">
                            {lesson.audiences?.join('; ') || lesson.audience}
                          </p>
                        )}
                        {lesson.metadataWarnings?.map((warning) => (
                          <p
                            className="mt-1 mb-0 text-xs text-u-muted"
                            key={warning}
                          >
                            {warning}
                          </p>
                        ))}
                        <p className="mt-1.5 mb-0 text-[13px] leading-relaxed text-u-muted wrap-anywhere">
                          <LessonRoom lesson={lesson} /> ·{' '}
                          {lesson.kind || 'Тип занятия не указан'}
                          {(lesson.teacher || lesson.teachers?.length) && (
                            <span className="agenda-teacher">
                              {' '}
                              · <LessonTeachers lesson={lesson} />
                            </span>
                          )}
                        </p>
                        <LessonTeacherSources entry={entry} />
                        <LessonDocument lesson={lesson} />
                        {entry.members.some(isGroup) &&
                          /военная\s+подготовка/iu.test(lesson.subject) && (
                            <details className="agenda-military mt-2">
                              <summary className="min-h-11 cursor-pointer rounded-sm py-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-u-ink">
                                Моё расписание ВУЦ · подробнее
                              </summary>
                              <MilitaryPreview date={lesson.date} />
                            </details>
                          )}
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
          {allHidden
            ? 'Карточки выбранных видов скрыты. Включи их в настройках отображения.'
            : missing.some(
                  (group) => comparisonIssue(group, day) === 'coverage',
                )
              ? 'Нет подтверждённых данных документа на этот день.'
              : excluded.length || missing.length
                ? schedules.some(
                    (group) => comparisonIssue(group, day) === 'subgroup',
                  )
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
