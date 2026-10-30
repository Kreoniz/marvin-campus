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
import { STALE_GRACE } from '../../../lib/cache-policy.ts';
import {
  kindIcon,
  kindLabel,
  scheduleKey,
  selectionKind,
  validSelection,
} from '../../../lib/schedule-ref.ts';
import type { Selection, ScheduleKind } from '../../../lib/types.ts';
import type { GroupColors } from '../../../lib/colors.ts';
import Icon from '../../../shared/ui/Icon.tsx';
import GroupOrder from './GroupOrder.tsx';
import {
  resourceSearchOptions,
  vucSearchOptions,
} from '../../resources/api.ts';

interface Props {
  selected: Selection[];
  vucOnly?: boolean;
  hiddenKinds?: ScheduleKind[];
  onAdd: (selection: Selection) => void;
  children: ReactNode;
  returnFocus: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colors: GroupColors;
  onMove: (key: string, offset: number) => void;
  onRemove: (key: string) => void;
  focusScheduleKey: string;
}
interface SearchResult {
  selection: Selection;
  saved: boolean;
}
const plurals: Record<ScheduleKind, string> = {
  group: 'Группы',
  lecturer: 'Преподаватели',
  auditorium: 'Аудитории',
  vuc: 'ВУЦ',
};

export default function GroupPicker({
  selected,
  vucOnly = false,
  hiddenKinds = [],
  onAdd,
  children,
  returnFocus,
  open,
  onOpenChange,
  colors,
  onMove,
  onRemove,
  focusScheduleKey,
}: Props) {
  const [query, setQuery] = useState('');
  const [managing, setManaging] = useState(false);
  const resultScroll = useRef<HTMLElement | null>(null);
  const savedScroll = useRef(0);
  const [debounced, setDebounced] = useState('');
  const [clock, setClock] = useState(Date.now());
  const [announcement, setAnnouncement] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const searchId = useId();
  const term = query.trim().toUpperCase();
  const showManagement = managing || (!term && !vucOnly);
  useEffect(() => {
    if (!open) return;
    setManaging(!!focusScheduleKey);
    if (focusScheduleKey)
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(
            `[data-group-order] [data-group-id="${focusScheduleKey}"] button:not(:disabled)`,
          )
          ?.focus(),
      );
  }, [open, focusScheduleKey]);
  const enabled = open && (vucOnly || term.length >= 2) && term === debounced;
  const selectedKeys = new Set(selected.map(scheduleKey));
  const groups = useQuery({
    ...groupOptions(debounced),
    enabled: enabled && !vucOnly,
  });
  const lecturers = useQuery({
    ...resourceSearchOptions('lecturer', debounced),
    enabled: enabled && !vucOnly,
  });
  const rooms = useQuery({
    ...resourceSearchOptions('auditorium', debounced),
    enabled: enabled && !vucOnly,
  });
  const vuc = useQuery({ ...vucSearchOptions(debounced), enabled });
  const sources = [
    { kind: 'group' as const, query: groups },
    { kind: 'lecturer' as const, query: lecturers },
    { kind: 'auditorium' as const, query: rooms },
    { kind: 'vuc' as const, query: vuc },
  ].filter((source) => !vucOnly || source.kind === 'vuc');
  const now = Math.max(clock, Date.now());
  const deadlines = sources.flatMap(({ query: search }) => {
    const expires = Date.parse(search.data?.expiresAt ?? '');
    if (!Number.isFinite(expires) || now > expires + STALE_GRACE) return [];
    return [now <= expires ? expires + 1 : expires + STALE_GRACE + 1];
  });
  const changeAt = deadlines.length ? Math.min(...deadlines) : undefined;
  useEffect(() => {
    if (!open || changeAt === undefined) return;
    const timer = setTimeout(
      () => setClock(Date.now()),
      Math.min(2_147_483_647, Math.max(1, changeAt - Date.now())),
    );
    return () => clearTimeout(timer);
  }, [open, changeAt]);
  useEffect(() => {
    if (!open || (!vucOnly && term.length < 2)) {
      setDebounced('');
      return;
    }
    const timer = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(timer);
  }, [term, open, vucOnly]);
  const visible: SearchResult[] = !enabled
    ? []
    : sources
        .flatMap(({ kind, query: search }) => {
          const snapshot = search.data;
          const expires = Date.parse(snapshot?.expiresAt ?? '');
          if (
            !snapshot ||
            !Array.isArray(snapshot.data) ||
            !Number.isFinite(expires) ||
            now > expires + STALE_GRACE
          )
            return [];
          return snapshot.data
            .filter(
              (item) => validSelection(item) && selectionKind(item) === kind,
            )
            .map((selection) => ({
              selection,
              saved: snapshot.stale || search.isError || now > expires,
            }));
        })
        .sort(
          (a, b) =>
            Number(selectedKeys.has(scheduleKey(a.selection))) -
            Number(selectedKeys.has(scheduleKey(b.selection))),
        );
  const loading =
    open &&
    (vucOnly || term.length >= 2) &&
    (term !== debounced ||
      sources.some(
        ({ query: search }) =>
          search.isPending && search.fetchStatus !== 'paused',
      ));
  const issues = !enabled
    ? []
    : sources.flatMap(({ kind, query: search }) => {
        const expires = Date.parse(search.data?.expiresAt ?? '');
        const expired =
          !!search.data &&
          (!Number.isFinite(expires) || now > expires + STALE_GRACE);
        const message =
          search.error?.message ||
          (search.data && !Array.isArray(search.data.data)
            ? 'Сервер вернул непонятный список.'
            : '') ||
          (expired
            ? 'Срок хранения результатов истёк.'
            : search.fetchStatus === 'paused'
              ? 'Нет сети.'
              : '');
        return message ? [{ kind, message, query: search }] : [];
      });
  const status =
    !vucOnly && term.length < 2
      ? 'Группа, фамилия, аудитория или взвод — от 2 символов.'
      : loading
        ? 'Ищем расписания…'
        : !visible.length && !issues.length
          ? 'Ничего не найдено. Попробуй другое название.'
          : '';
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <Dialog.Content
        className="schedule-search flex h-[min(640px,calc(100dvh-24px))] w-[min(500px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] flex-col overflow-y-auto p-4"
        initialFocus={() =>
          (focusScheduleKey
            ? document.querySelector<HTMLElement>(
                `[data-group-order] [data-group-id="${focusScheduleKey}"] button:not(:disabled):not([data-group-remove])`,
              )
            : null) ??
          input.current ??
          true
        }
        finalFocus={() =>
          (focusScheduleKey
            ? Array.from(
                document.querySelectorAll<HTMLButtonElement>(
                  `[data-drag-id="${focusScheduleKey}"]`,
                ),
              ).find((button) => button.offsetParent !== null)
            : null) ??
          returnFocus.current ??
          document.querySelector<HTMLButtonElement>('.welcome .add-group') ??
          true
        }
      >
        <div className="mb-1 flex shrink-0 items-center justify-between gap-3">
          <Dialog.Title className="m-0 text-xl leading-6">
            {vucOnly ? 'Расписания ВУЦ' : 'Расписания'}
          </Dialog.Title>
          <Dialog.Close
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="min-h-11 min-w-11 shrink-0"
                aria-label="Закрыть выбор расписаний"
              />
            }
          >
            <Icon name="close" />
          </Dialog.Close>
        </div>
        {!vucOnly && (
          <a
            href="/vuc"
            className="mb-1 inline-flex min-h-8 shrink-0 items-center text-xs underline"
          >
            Отдельное сравнение ВУЦ →
          </a>
        )}
        <Dialog.Description className="sr-only">
          Найди группу, преподавателя, аудиторию или взвод ВУЦ. Все расписания
          добавляются в один календарь.
        </Dialog.Description>
        <Field.Root className="flex min-h-0 flex-1 flex-col">
          <Field.Label
            className="mt-1 mb-1 block text-sm font-semibold"
            htmlFor={searchId}
          >
            {vucOnly ? 'Номер ВУЦ' : 'Что найти'}
          </Field.Label>
          <Combobox.Root<SearchResult>
            inline
            open
            items={showManagement ? [] : visible}
            filter={null}
            value={null}
            inputValue={query}
            onInputValueChange={(value, details) => {
              if (details.reason !== 'item-press') {
                setQuery(value);
                setManaging(false);
              }
            }}
            itemToStringLabel={(result) => result.selection.label}
            isItemEqualToValue={(a, b) =>
              scheduleKey(a.selection) === scheduleKey(b.selection)
            }
            onValueChange={(result) => {
              if (
                result &&
                !selectedKeys.has(scheduleKey(result.selection)) &&
                selected.length < 30
              ) {
                onAdd(result.selection);
                setAnnouncement(
                  `${result.selection.label}: расписание добавлено.`,
                );
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
                placeholder={
                  vucOnly ? 'Например, 431' : 'ФИТ-232, Иванов, 8-201, ВУЦ'
                }
                autoComplete="off"
              />
            </div>
            <div className="mt-1 shrink-0">
              {managing && (term || vucOnly) ? (
                <Button
                  variant="ghost"
                  className="min-h-11 text-sm"
                  onClick={() => {
                    setManaging(false);
                    requestAnimationFrame(() => {
                      input.current?.focus({ preventScroll: true });
                      if (resultScroll.current)
                        resultScroll.current.scrollTop = savedScroll.current;
                    });
                  }}
                >
                  <Icon name="left" size={16} />
                  Назад к поиску
                </Button>
              ) : term || vucOnly ? (
                <Button
                  variant="ghost"
                  className="min-h-11 text-sm"
                  onClick={() => {
                    savedScroll.current = resultScroll.current?.scrollTop ?? 0;
                    setManaging(true);
                  }}
                >
                  Управлять выбранными · {selected.length}
                </Button>
              ) : (
                <p className="my-2 text-xs text-u-muted">
                  Выбраны · {selected.length}
                </p>
              )}
              {selected.length >= 30 && (
                <p className="m-0 text-xs text-u-muted">
                  Выбраны все 30. Убери одно, чтобы добавить другое.
                </p>
              )}
            </div>
            {showManagement && (
              <section
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                aria-label="Выбранные расписания"
              >
                {selected.length ? (
                  <GroupOrder
                    hiddenKinds={hiddenKinds}
                    groups={selected}
                    colors={colors}
                    onMove={onMove}
                    onRemove={onRemove}
                    onEmpty={() => {
                      setManaging(false);
                      input.current?.focus({ preventScroll: true });
                    }}
                  />
                ) : (
                  <p className="my-3 text-sm text-u-muted">
                    Начни с названия группы, фамилии или аудитории.
                  </p>
                )}
              </section>
            )}
            <div
              className={`mt-2 min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden ${showManagement ? 'hidden' : 'grid'}`}
            >
              <Combobox.List
                ref={(node) => {
                  resultScroll.current = node;
                }}
                className="h-full min-h-0 max-h-none overflow-y-auto overscroll-contain p-0"
              >
                {(result: SearchResult) => {
                  const { selection, saved } = result;
                  const added = selectedKeys.has(scheduleKey(selection));
                  return (
                    <Combobox.Item
                      className="min-h-14 border-b border-u-line-soft px-2 py-2 [&>span:first-child]:w-full"
                      key={scheduleKey(selection)}
                      value={result}
                      disabled={added || selected.length >= 30}
                    >
                      <span className="flex w-full items-center gap-2.5">
                        <span className="shrink-0 text-u-muted">
                          <Icon
                            name={kindIcon(selectionKind(selection))}
                            size={18}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="block text-[15px] leading-5 wrap-anywhere">
                            {selection.label}
                          </strong>
                          <small className="mt-0.5 block text-[13px] leading-4.5 text-u-muted">
                            {kindLabel(selectionKind(selection))}
                            {selection.description
                              ? ` · ${selection.description}`
                              : ''}
                            {saved && ' · сохранено'}
                          </small>
                        </span>
                        <span className="shrink-0">
                          {added ? (
                            <span className="text-xs text-u-muted">
                              Добавлено
                            </span>
                          ) : (
                            <Icon name="plus" size={16} />
                          )}
                        </span>
                      </span>
                    </Combobox.Item>
                  );
                }}
              </Combobox.List>
              <Combobox.Status className="m-0 max-h-28 overflow-y-auto p-0 pt-2 text-[13px] leading-4.5 text-u-muted">
                {status}
                {issues.map(({ kind, message, query: search }) => (
                  <span key={kind} className="mt-1 block">
                    {plurals[kind]}: {message}{' '}
                    <button
                      type="button"
                      className="min-h-6 cursor-pointer rounded-sm border-0 bg-transparent p-0 text-inherit underline focus-visible:outline-2 focus-visible:outline-u-ink"
                      disabled={
                        search.isFetching || search.fetchStatus === 'paused'
                      }
                      onClick={() => void search.refetch()}
                    >
                      Повторить
                    </button>
                  </span>
                ))}
              </Combobox.Status>
            </div>
            <Combobox.Empty className="sr-only">
              {!loading && !issues.length && term.length >= 2
                ? 'Нет подходящих расписаний'
                : null}
            </Combobox.Empty>
          </Combobox.Root>
          <span className="sr-only" role="status">
            {announcement}
          </span>
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
          aria-label={labelled ? 'Добавить расписание' : 'Расписания'}
        />
      }
    >
      <Icon name={labelled ? 'plus' : 'search'} />
      <span className={labelled ? undefined : 'compact:hidden'}>
        {labelled ? 'Добавить расписание' : 'Расписания'}
      </span>
    </Dialog.Trigger>
  );
}
