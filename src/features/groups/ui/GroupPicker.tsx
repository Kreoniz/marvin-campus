import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from 'unlikely-ui/button';
import { Combobox } from 'unlikely-ui/combobox';
import { Dialog } from 'unlikely-ui/dialog';
import { Field } from 'unlikely-ui/field';
import { groupOptions } from '../../../lib/queries.ts';
import type { Group, Selection } from '../../../lib/types.ts';
import Icon from '../../../shared/ui/Icon.tsx';

interface Props {
  selected: Selection[];
  onAdd: (group: Group) => void;
  onError: (message: string) => void;
}

export default function GroupPicker({ selected, onAdd, onError }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const reportedError = useRef(0);
  const searchId = useId();
  const term = query.trim().toUpperCase();
  const search = useQuery({
    ...groupOptions(debounced),
    enabled: open && term.length >= 2 && term === debounced,
  });
  const results = term === debounced ? (search.data?.data ?? []) : [];
  const loading =
    open && term.length >= 2 && (term !== debounced || search.isPending);
  const error = term === debounced ? (search.error?.message ?? '') : '';
  const stale = term === debounced && !!search.data?.stale;
  const visible = (term.length < 2 ? [] : results).filter(
    (group) => !selected.some((s) => s.id === group.id),
  );
  useEffect(() => {
    if (!open || term.length < 2) {
      setDebounced('');
      return;
    }
    const timer = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(timer);
  }, [term, open]);
  useEffect(() => {
    if (open && error && search.errorUpdatedAt !== reportedError.current) {
      reportedError.current = search.errorUpdatedAt;
      onError(error);
    }
  }, [open, error, search.errorUpdatedAt, onError]);
  const status = loading
    ? 'Ищем группы…'
    : error ||
      (stale
        ? 'Поиск по сохранённому снимку: источник временно недоступен.'
        : term.length >= 2 && !visible.length
          ? 'Группы не найдены. Попробуй другое название.'
          : term.length < 2
            ? 'Для поиска введи хотя бы 2 символа.'
            : '');
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button
            className="add-group max-[700px]:size-11 max-[700px]:min-h-11 max-[700px]:min-w-11 max-[700px]:p-0"
            variant="secondary"
            disabled={selected.length >= 30}
            aria-label="Добавить группу"
          />
        }
      >
        <Icon name="plus" />
        <span className="max-[700px]:hidden">Группа</span>
      </Dialog.Trigger>
      <Dialog.Content
        className="w-[min(460px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-y-auto"
        initialFocus={input}
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <Dialog.Title className="m-0 text-xl leading-6">
            Добавить группу
          </Dialog.Title>
          <Dialog.Close
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="min-h-11 min-w-11 shrink-0"
                aria-label="Закрыть поиск"
              />
            }
          >
            <Icon name="close" />
          </Dialog.Close>
        </div>
        <Dialog.Description>
          Найди свою группу или группу друга в расписании ОмГТУ.
        </Dialog.Description>
        <Field.Root>
          <Field.Label
            className="mt-5 mb-2 block text-[13px] font-semibold"
            htmlFor={searchId}
          >
            Название группы
          </Field.Label>
          <Combobox.Root<Group>
            inline
            open
            items={visible}
            filter={null}
            value={null}
            inputValue={query}
            onInputValueChange={(value, details) => {
              if (details.reason !== 'item-press') setQuery(value);
            }}
            itemToStringLabel={(group) => group.label}
            isItemEqualToValue={(a, b) => a.id === b.id}
            onValueChange={(group) => {
              if (group && selected.length < 30) {
                onAdd(group);
                setOpen(false);
                setQuery('');
              }
            }}
          >
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 z-1 flex items-center text-u-muted">
                <Icon name="search" />
              </span>
              <Combobox.Input
                className="min-h-11 w-full pl-10 text-base"
                id={searchId}
                ref={input}
                placeholder="Например, ФИТ-232"
                autoComplete="off"
              />
            </div>
            <div className="mt-3 grid h-[clamp(176px,calc(100dvh-340px),346px)] grid-rows-[minmax(0,1fr)_56px] overflow-hidden">
              <Combobox.List className="h-full min-h-0 max-h-none overflow-y-auto overscroll-contain p-0">
                {(group: Group) => (
                  <Combobox.Item
                    className="min-h-14 border-b border-u-line-soft px-2 py-2.5 [&>span:first-child]:w-full"
                    key={group.id}
                    value={group}
                  >
                    <span className="flex w-full items-center justify-between gap-3">
                      <span className="min-w-0">
                        <strong className="block text-sm leading-5">
                          {group.label}
                        </strong>
                        <small className="mt-0.5 block text-xs leading-4 text-u-muted">
                          {group.description ?? 'ОмГТУ'}
                        </small>
                      </span>
                      <span className="flex shrink-0 items-center">
                        <Icon name="plus" size={16} />
                      </span>
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
              <Combobox.Status className="m-0 overflow-y-auto p-0 pt-3 text-xs leading-4.5 text-u-muted">
                {status}
              </Combobox.Status>
            </div>
            <Combobox.Empty className="sr-only">
              {!loading && !error && term.length >= 2
                ? 'Нет подходящих групп'
                : null}
            </Combobox.Empty>
          </Combobox.Root>
        </Field.Root>
      </Dialog.Content>
    </Dialog.Root>
  );
}
