import { useState } from 'react';
import { Button } from 'unlikely-ui/button';
import useVucCatalogue from './use-vuc-catalogue.ts';
import type { VucRef } from '../../lib/types.ts';
import { compactVucLabel } from '../../lib/schedule-ref.ts';
import Icon from '../../shared/ui/Icon.tsx';

export default function VucCatalogue({
  onAdd,
}: {
  onAdd: (ref: VucRef) => void;
}) {
  const [term, setTerm] = useState('');
  const { query, entries, expired } = useVucCatalogue();
  const refs = entries.filter((ref) =>
    `${ref.label} ${ref.description ?? ''}`
      .toLocaleLowerCase('ru')
      .includes(term.trim().toLocaleLowerCase('ru')),
  );
  return (
    <section
      className="vuc-catalogue mx-auto max-w-3xl p-5 compact:px-4"
      aria-label="Выбор расписаний ВУЦ"
    >
      <h2 className="mt-0 mb-2 text-xl font-bold">Расписание ВУЦ</h2>
      <p className="mb-3 text-sm leading-relaxed text-u-muted">
        Выбери одно или несколько расписаний. Даты и предупреждения сохраняются
        из документов.
      </p>
      <label
        className="mb-1 block text-sm font-semibold"
        htmlFor="vuc-catalogue-search"
      >
        Найти ВУЦ
      </label>
      <input
        id="vuc-catalogue-search"
        type="search"
        className="mb-3 min-h-11 w-full rounded-u-control border border-u-line bg-u-surface px-3 text-base text-u-ink focus-visible:outline-2 focus-visible:outline-u-ink"
        placeholder="Например, 431"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
      />
      {query.isPending && <p role="status">Загружаем список ВУЦ…</p>}
      {query.isError && (
        <p className="text-sm" role="status">
          {query.error.message}{' '}
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Повторить
          </Button>
        </p>
      )}
      {!query.isPending && !query.isError && !refs.length && (
        <p className="text-sm text-u-muted">
          {expired
            ? 'Срок хранения списка истёк.'
            : 'Подходящих расписаний нет.'}
          {expired && (
            <button
              type="button"
              className="ml-1 underline"
              onClick={() => void query.refetch()}
            >
              Повторить
            </button>
          )}
        </p>
      )}
      <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
        {refs.map((ref) => (
          <li key={ref.id}>
            <button
              type="button"
              className="flex min-h-16 w-full cursor-pointer items-center justify-between gap-3 rounded-u-control border border-u-line bg-u-surface p-3 text-left hover:bg-u-well focus-visible:outline-2 focus-visible:outline-u-ink"
              onClick={() => onAdd(ref)}
              aria-label={`Добавить ${compactVucLabel(ref.label)}`}
            >
              <span className="min-w-0">
                <strong className="block text-sm">
                  {compactVucLabel(ref.label)}
                </strong>
                <small className="mt-1 block text-xs leading-relaxed text-u-muted">
                  {ref.sourcePeriod ||
                    ref.description ||
                    `${ref.firstDate}–${ref.lastDate}`}
                </small>
              </span>
              <Icon name="plus" size={18} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
