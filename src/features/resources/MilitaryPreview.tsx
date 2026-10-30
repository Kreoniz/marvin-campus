import { useId } from 'react';
import { Skeleton } from 'unlikely-ui/skeleton';
import { monday, formatDay } from '../../lib/dates.ts';
import { compactVucLabel } from '../../lib/schedule-ref.ts';
import { viewURL } from '../../lib/url.ts';
import type { VucRef } from '../../lib/types.ts';
import useMilitarySchedule from './use-military-schedule.ts';
import VucDocumentNotes from './VucDocumentNotes.tsx';

function vucPageURL(refs: VucRef[], date: string) {
  const url = viewURL(
    { groups: refs, day: date, week: monday(date), mode: 'free' },
    new URL('/vuc', location.origin),
  );
  return url.pathname + url.search;
}
export default function MilitaryPreview({ date }: { date: string }) {
  const id = useId();
  const {
    catalogue,
    expired,
    available,
    ref,
    result,
    snapshot,
    data,
    lessons,
    covered,
    unresolved,
    nearest,
    hasNotes,
    times,
    selectMilitary,
  } = useMilitarySchedule(date);
  const caption = (item: VucRef) => {
    const years = [
      ...new Set(
        item.sourcePeriod?.match(/\b(?:19|20)\d{2}\b/g) ??
          [item.firstDate?.slice(0, 4), item.lastDate?.slice(0, 4)].filter(
            Boolean,
          ),
      ),
    ].sort();
    return `${compactVucLabel(item.label)}${years.length ? ` · ${years[0]}${years.length > 1 ? `–${years.at(-1)}` : ''}` : ''}`;
  };
  const optionLabel = (item: VucRef) =>
    available.filter((other) => caption(other) === caption(item)).length > 1
      ? `${caption(item)} · ${item.sourceLabel || item.description || item.id}`
      : caption(item);
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
            {optionLabel(item)}
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
            · Документ. Актуальность на сайте ВУЦ не проверена.
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
                  </li>
                ))}
              </ol>
              {hasNotes && (
                <details className="mt-2 text-xs leading-relaxed">
                  <summary className="min-h-8 cursor-pointer rounded-sm py-1.5 focus-visible:outline-2 focus-visible:outline-u-ink">
                    Примечания документа
                  </summary>
                  {data?.sourcePeriod && (
                    <p className="my-1 text-u-muted">{data.sourcePeriod}</p>
                  )}
                  <VucDocumentNotes
                    date={date}
                    warnings={data?.warnings}
                    cells={data?.unparsedCells}
                  />
                </details>
              )}
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
