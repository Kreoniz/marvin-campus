import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from 'unlikely-ui/button';
import { Combobox } from 'unlikely-ui/combobox';
import { Dialog } from 'unlikely-ui/dialog';
import { Field } from 'unlikely-ui/field';
import { groupOptions } from '../../../lib/queries.ts';
import type { Group, Selection } from '../../../lib/types.ts';
import Icon from '../../../shared/ui/Icon.tsx';
import type { GroupColors } from '../../../lib/colors.ts';
import GroupOrder from './GroupOrder.tsx';

interface Props {
  selected: Selection[];
  onAdd: (group: Group) => void;
  onError: (message: string) => void;
  children: ReactNode;
  returnFocus: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colors: GroupColors;
  onMove: (id: number, offset: number) => void;
  onRemove: (id: number) => void;
  focusGroupId: number;
}

export default function GroupPicker({
  selected,
  onAdd,
  onError,
  children,
  returnFocus,
  open,
  onOpenChange,
  colors,
  onMove,
  onRemove,
  focusGroupId,
}: Props) {
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
    open &&
    term.length >= 2 &&
    (term !== debounced ||
      (search.isPending && search.fetchStatus !== 'paused'));
  const error = term === debounced ? (search.error?.message ?? '') : '';
  const stale = term === debounced && !!search.data?.stale;
  const visible = term.length < 2 ? [] : results;
  const selectedIds = new Set(selected.map((group) => group.id));
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
  const status =
    selected.length >= 30
      ? 'Добавлено максимум 30 групп. Убери одну из выбранных групп, чтобы добавить другую.'
      : search.fetchStatus === 'paused' && !results.length
        ? 'Нет сети. Поиск продолжится после подключения.'
        : loading
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <Dialog.Content
        className="flex h-[min(620px,calc(100dvh-32px))] w-[min(460px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] flex-col overflow-y-auto"
        initialFocus={() =>
          (focusGroupId
            ? document.querySelector<HTMLElement>(
                `[data-group-order] [data-group-id="${focusGroupId}"] button:not(:disabled):not([data-group-remove])`,
              )
            : null) ??
          input.current ??
          true
        }
        finalFocus={() =>
          (focusGroupId
            ? Array.from(
                document.querySelectorAll<HTMLButtonElement>(
                  `[data-drag-id="${focusGroupId}"]`,
                ),
              ).find((button) => button.offsetParent !== null)
            : null) ??
          returnFocus.current ??
          document.querySelector<HTMLButtonElement>('.welcome .add-group') ??
          true
        }
      >
        <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
          <Dialog.Title className="m-0 text-xl leading-6">Группы</Dialog.Title>
          <Dialog.Close
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="min-h-11 min-w-11 shrink-0"
                aria-label="Закрыть группы"
              />
            }
          >
            <Icon name="close" />
          </Dialog.Close>
        </div>
        <Dialog.Description className="sr-only">
          Найди группы, поменяй порядок или убери их из сравнения.
        </Dialog.Description>
        <Field.Root className="flex min-h-0 flex-1 flex-col">
          <Field.Label
            className="mt-2 mb-2 block text-[13px] font-semibold"
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
              if (group && !selectedIds.has(group.id) && selected.length < 30) {
                onAdd(group);
                input.current?.focus({ preventScroll: true });
              }
            }}
          >
            <div className="relative shrink-0">
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
            {selected.length > 0 && (
              <section className="mt-3 shrink-0" aria-label="Выбранные группы">
                <h3 className="m-0 text-xs font-semibold text-u-muted">
                  Выбраны · {selected.length}
                </h3>
                <GroupOrder
                  groups={selected}
                  colors={colors}
                  onMove={onMove}
                  onRemove={onRemove}
                  onEmpty={() => input.current?.focus({ preventScroll: true })}
                />
              </section>
            )}
            <div className="mt-3 grid min-h-24 flex-1 grid-rows-[minmax(0,1fr)_56px] overflow-hidden">
              <Combobox.List className="h-full min-h-0 max-h-none overflow-y-auto overscroll-contain p-0">
                {(group: Group) => (
                  <Combobox.Item
                    className="min-h-14 border-b border-u-line-soft px-2 py-2.5 [&>span:first-child]:w-full"
                    key={group.id}
                    value={group}
                    disabled={
                      selectedIds.has(group.id) || selected.length >= 30
                    }
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
                        {selectedIds.has(group.id) ? (
                          <span className="text-xs text-u-muted">
                            Уже добавлена
                          </span>
                        ) : (
                          <Icon name="plus" size={16} />
                        )}
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

export function GroupPickerTrigger({
  labelled = false,
  buttonRef,
  onClick,
}: {
  labelled?: boolean;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  onClick?: () => void;
}) {
  return (
    <Dialog.Trigger
      ref={buttonRef}
      onClick={onClick}
      render={
        <Button
          className={
            labelled
              ? 'add-group compact:min-h-11'
              : 'add-group compact:size-11 compact:min-h-11 compact:min-w-11 compact:p-0'
          }
          variant="secondary"
          aria-label={labelled ? 'Добавить группу' : 'Группы'}
        />
      }
    >
      <Icon name={labelled ? 'plus' : 'groups'} />
      <span className={labelled ? undefined : 'compact:hidden'}>
        {labelled ? 'Добавить группу' : 'Группы'}
      </span>
    </Dialog.Trigger>
  );
}
