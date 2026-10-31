import { useId } from 'react';
import { Skeleton } from 'unlikely-ui/skeleton';
import { Select } from 'unlikely-ui/select';
import { monday, formatDay } from '../../lib/dates.ts';
import { vucOptionLabel } from '../../lib/selection-labels.ts';
import { viewURL } from '../../lib/url.ts';
import type { VucRef } from '../../lib/types.ts';
import useMilitarySchedule from './use-military-schedule.ts';
import VucDocumentNotes from './VucDocumentNotes.tsx';
import VucOriginalLink from './VucOriginalLink.tsx';

function vucPageURL(refs: VucRef[], date: string) {
  const url = viewURL(
    { groups: refs, day: date, week: monday(date), mode: 'free' },
    new URL('/vuc', location.origin),
  );
  return url.pathname + url.search;
}
export default function MilitaryPreview({
  date,
  collapseEntries = false,
}: {
  date: string;
  collapseEntries?: boolean;
}) {
  const id = useId();
  const {
    catalogue,
    expired,
    missingPreferred,
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
  const choices = [
    { value: '', label: 'Выбрать ВУЦ' },
    ...available.map((item) => ({
      value: item.id,
      label: vucOptionLabel(item, available),
    })),
  ];
  const entries = (
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
  );
  return (
    <section
      className="military-preview mt-3 border-t border-u-line-soft pt-3"
      aria-label="Расписание ВУЦ в этот день"
    >
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        Расписание ВУЦ
      </label>
      <Select.Root
        items={choices}
        value={ref?.id ?? ''}
        onValueChange={(value) => selectMilitary(value ?? '')}
      >
        <Select.Trigger id={id} className="min-h-11 w-full text-sm">
          <Select.Value />
        </Select.Trigger>
        <Select.Content className="max-h-[min(320px,var(--available-height))] min-w-[var(--anchor-width)] max-w-[calc(100vw-32px)]">
          {choices.map((item) => (
            <Select.Item key={item.value} value={item.value}>
              {item.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
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
      {missingPreferred && (
        <p className="my-2 text-xs text-u-muted" role="status">
          Выбранного расписания нет в текущем наборе ВУЦ. Выбери другое.
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
              {collapseEntries && lessons.length > 0 ? (
                <details className="military-full-entries mt-2">
                  <summary className="min-h-9 cursor-pointer rounded-sm py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-u-ink">
                    Все занятия на этот день · {lessons.length}
                  </summary>
                  {entries}
                </details>
              ) : (
                entries
              )}
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
        <VucOriginalLink ref={ref} />
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
