import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from 'unlikely-ui/skeleton';
import { vucWeekOptions } from './api.ts';
import { useResourceInspector } from './ResourceInspector.tsx';
import { usableSnapshot } from '../../lib/cache-policy.ts';
import { monday, formatDay, timeLabel } from '../../lib/dates.ts';
import { compactVucLabel } from '../../lib/schedule-ref.ts';
import { viewURL } from '../../lib/url.ts';
import { nearestVucDate } from '../../lib/vuc-navigation.ts';
import type { Lesson, VucRef } from '../../lib/types.ts';
import LessonDocument from './LessonDocument.tsx';
import useVucCatalogue from './use-vuc-catalogue.ts';

export function vucPageURL(refs: VucRef[], date: string) {
  const url = viewURL(
    { groups: refs, day: date, week: monday(date), mode: 'free' },
    new URL('/vuc', location.origin),
  );
  return url.pathname + url.search;
}
export default function MilitaryPreview({ date }: { date: string }) {
  const id = useId();
  const { schedules, militaryId, selectMilitary } = useResourceInspector();
  const {
    query: catalogue,
    entries: catalogueEntries,
    expired,
  } = useVucCatalogue();
  const selected = schedules.filter((row) => row.selection.kind === 'vuc');
  const available = [
    ...new Map(
      [
        ...catalogueEntries,
        ...selected.map((row) => row.selection as VucRef),
      ].map((ref) => [ref.id, ref]),
    ).values(),
  ];
  const preferred =
    militaryId || (selected.length === 1 ? selected[0].selection.id : '');
  const ref = available.find((item) => item.id === preferred);
  const result = useQuery({
    ...vucWeekOptions(
      ref ?? { kind: 'vuc', id: 'unselected', label: 'ВУЦ' },
      monday(date),
    ),
    enabled: !!ref,
  });
  const snapshot = usableSnapshot(result.data, monday(date), Date.now());
  const data = snapshot?.data;
  const lessons = (data?.lessons ?? [])
    .filter((lesson) => lesson.date === date)
    .sort(
      (a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id),
    );
  const covered = data?.coveredDates.includes(date);
  const unresolved = data?.unresolvedDates?.includes(date);
  const nearest = ref && nearestVucDate(ref, date, data?.coveredDates);
  const times = (lesson: Lesson) =>
    (lesson.sourceIntervals?.length ? lesson.sourceIntervals : [lesson])
      .map((range) => `${timeLabel(range.start)}–${timeLabel(range.end)}`)
      .join(', ');
  return (
    <section
      className="military-preview mt-3 border-t border-u-line-soft pt-3"
      aria-label="Расписание ВУЦ в этот день"
    >
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        Моё расписание ВУЦ
      </label>
      <select
        id={id}
        className="min-h-11 w-full rounded-u-control border border-u-line bg-u-surface px-2 text-sm text-u-ink focus-visible:outline-2 focus-visible:outline-u-ink"
        value={ref?.id ?? ''}
        onChange={(event) => selectMilitary(event.target.value)}
      >
        <option value="">Выбрать ВУЦ</option>
        {available.map((item) => (
          <option key={item.id} value={item.id}>
            {compactVucLabel(item.label)} ·{' '}
            {item.sourcePeriod ||
              item.description ||
              `${item.firstDate}–${item.lastDate}`}
          </option>
        ))}
      </select>
      {catalogue.isPending && !available.length && (
        <p className="my-2 text-xs text-u-muted">Загружаем список ВУЦ…</p>
      )}
      {catalogue.isError && (
        <p className="my-2 text-xs text-u-muted" role="status">
          {catalogue.error.message}{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void catalogue.refetch()}
          >
            Повторить
          </button>
        </p>
      )}
      {expired && (
        <p className="my-2 text-xs text-u-muted" role="status">
          Срок хранения списка истёк.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => void catalogue.refetch()}
          >
            Повторить
          </button>
        </p>
      )}
      {ref && (
        <>
          <p className="my-2 text-xs leading-relaxed text-u-muted">
            {formatDay(date, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}{' '}
            · Документ{data?.sourcePeriod ? ` · ${data.sourcePeriod}` : ''}.
            Актуальность на сайте ВУЦ не проверена.
          </p>
          {result.isPending && !snapshot ? (
            <Skeleton className="h-16 w-full" />
          ) : !snapshot ? (
            <p className="text-xs" role="status">
              {result.error?.message || 'Срок хранения данных истёк.'}{' '}
              <button
                type="button"
                className="underline"
                onClick={() => void result.refetch()}
              >
                Повторить
              </button>
            </p>
          ) : (
            <>
              {result.error && (
                <p className="text-xs text-u-muted" role="status">
                  {result.error.message} Показаны сохранённые данные.
                </p>
              )}
              {(!covered || unresolved) && (
                <p className="text-xs text-u-muted" role="status">
                  {unresolved
                    ? 'Есть неоднозначные строки. Ниже только известные занятия.'
                    : 'В документе нет подтверждённых данных на этот день.'}
                </p>
              )}
              {covered && !unresolved && !lessons.length && (
                <p className="text-xs">По документу занятий нет.</p>
              )}
              <ol className="m-0 list-none space-y-2 p-0">
                {lessons.map((lesson) => (
                  <li
                    key={lesson.id}
                    className="border-t border-u-line-soft pt-2 text-xs leading-relaxed"
                  >
                    <time className="font-semibold">{times(lesson)}</time>
                    <strong className="block text-sm">{lesson.subject}</strong>
                    {[lesson.room, lesson.teacher].filter(Boolean).join(' · ')}
                    <LessonDocument lesson={lesson} />
                  </li>
                ))}
              </ol>
            </>
          )}
        </>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs">
        <a
          className="inline-flex min-h-8 items-center underline"
          href={vucPageURL(ref ? [ref] : [], date)}
        >
          Сравнить расписания ВУЦ →
        </a>
        {ref && !covered && nearest && nearest !== date && (
          <a
            className="inline-flex min-h-8 items-center underline"
            href={vucPageURL([ref], nearest)}
          >
            Открыть{' '}
            {formatDay(nearest, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </a>
        )}
      </div>
    </section>
  );
}
