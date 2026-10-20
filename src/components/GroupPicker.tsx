import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from 'unlikely-ui/button';
import { Combobox } from 'unlikely-ui/combobox';
import { Dialog } from 'unlikely-ui/dialog';
import { Field } from 'unlikely-ui/field';
import { groupOptions } from '../lib/queries.ts';
import type { Group, Selection } from '../lib/types.ts';
import Icon from './Icon.tsx';

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
            className="add-group"
            variant="secondary"
            disabled={selected.length >= 30}
            aria-label="Добавить группу"
          />
        }
      >
        <Icon name="plus" />
        <span className="add-group-label">Группа</span>
      </Dialog.Trigger>
      <Dialog.Content className="campus-group-dialog" initialFocus={input}>
        <div className="control-dialog-heading">
          <Dialog.Title>Добавить группу</Dialog.Title>
          <Dialog.Close
            render={
              <Button
                variant="ghost"
                size="icon-sm"
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
          <Field.Label className="group-search-label" htmlFor={searchId}>
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
            <div className="group-search-input">
              <Icon name="search" />
              <Combobox.Input
                id={searchId}
                ref={input}
                placeholder="Например, ФИТ-232"
                autoComplete="off"
              />
            </div>
            <div
              className={`group-results-slot ${term.length >= 2 ? 'searching' : ''}`}
            >
              <Combobox.List className="group-results">
                {(group: Group) => (
                  <Combobox.Item
                    className="group-result"
                    key={group.id}
                    value={group}
                  >
                    <strong>{group.label}</strong>
                    <small>{group.description ?? 'ОмГТУ'}</small>
                    <Icon name="plus" size={16} />
                  </Combobox.Item>
                )}
              </Combobox.List>
            </div>
            <Combobox.Status className="group-search-status">
              {status}
            </Combobox.Status>
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
