import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from 'unlikely-ui/button';
import { Dialog } from 'unlikely-ui/dialog';
import { Popover } from 'unlikely-ui/popover';
import { Skeleton } from 'unlikely-ui/skeleton';
import {
  addDays,
  formatDay,
  monday,
  omskToday,
  timeLabel,
  validDate,
  weekLabel,
} from '../../lib/dates.ts';
import { snapshotChangeAt, usableSnapshot } from '../../lib/cache-policy.ts';
import type { Lesson, ResourceRef } from '../../lib/types.ts';
import Icon from '../../shared/ui/Icon.tsx';
import IconButton from '../../shared/ui/IconButton.tsx';
import DatePicker from '../comparison/ui/LazyDatePicker.tsx';
import { resourceWeekOptions } from './api.ts';

type OpenResource = (
  resource: ResourceRef,
  trigger?: HTMLElement | null,
  date?: string,
) => void;
const InspectorContext = createContext<{ openResource: OpenResource }>({
  openResource: () => {},
});

export function useResourceInspector() {
  return useContext(InspectorContext);
}

export function ResourceProvider({
  day,
  children,
}: {
  day: string;
  children: ReactNode;
}) {
  const [opened, setOpened] = useState<{
    resource: ResourceRef;
    day: string;
    trigger: HTMLElement | null;
    serial: number;
  }>();
  const [open, setOpen] = useState(false);
  const serial = useRef(0);
  const openResource = useCallback<OpenResource>(
    (
      resource,
      trigger = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null,
      date = day,
    ) => {
      if (
        !Number.isInteger(resource.id) ||
        resource.id <= 0 ||
        resource.id > 10000000 ||
        (resource.kind !== 'lecturer' && resource.kind !== 'auditorium')
      )
        return;
      setOpened({
        resource,
        day: validDate(date) ? date : day,
        trigger,
        serial: ++serial.current,
      });
      setOpen(true);
    },
    [day],
  );
  const value = useMemo(() => ({ openResource }), [openResource]);
  return (
    <InspectorContext.Provider value={value}>
      {children}
      {opened && (
        <ResourceDialog
          key={opened.serial}
          resource={opened.resource}
          initialDay={opened.day}
          open={open}
          onOpenChange={setOpen}
          returnFocus={() =>
            opened.trigger?.isConnected
              ? opened.trigger
              : (document.querySelector<HTMLButtonElement>('.add-group') ??
                true)
          }
        />
      )}
    </InspectorContext.Provider>
  );
}

function ResourceDialog({
  resource,
  initialDay,
  open,
  onOpenChange,
  returnFocus,
}: {
  resource: ResourceRef;
  initialDay: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: () => HTMLElement | true;
}) {
  const [day, setDay] = useState(initialDay);
  const [dateOpen, setDateOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const days = useRef<HTMLElement>(null);
  const week = monday(day);
  const query = useQuery({
    ...resourceWeekOptions(resource, week),
    enabled: open,
  });
  const snapshot = usableSnapshot(
    query.data,
    week,
    Math.max(now, Date.now(), query.dataUpdatedAt),
  );
  const saved = !!snapshot && (snapshot.stale || query.isError);
  const entries =
    snapshot?.data.lessons.filter((lesson) => lesson.date === day) ?? [];
  const intervals = new Map<string, Lesson[]>();
  for (const lesson of entries) {
    const key = `${lesson.start}:${lesson.end}`;
    const existing = intervals.get(key);
    if (existing) existing.push(lesson);
    else intervals.set(key, [lesson]);
  }
  const changeAt = snapshotChangeAt(query.data, week, now);
  useEffect(() => {
    if (!open || changeAt === undefined) return;
    const timer = setTimeout(
      () => setNow(Date.now()),
      Math.max(1, changeAt - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [open, changeAt]);
  const checked =
    snapshot &&
    new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Asia/Omsk',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(snapshot.checkedAt));
  function selectDay(value: string, focus = false) {
    setDay(value);
    if (focus)
      requestAnimationFrame(() =>
        days.current
          ?.querySelector<HTMLButtonElement>(`[data-resource-day="${value}"]`)
          ?.focus(),
      );
  }
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        className="resource-inspector flex h-[min(860px,calc(100dvh-32px))] w-[min(760px,calc(100vw-32px))] max-w-full flex-col overflow-hidden p-4 compact:px-3 [@media(max-height:500px)]:block [@media(max-height:500px)]:overflow-y-auto"
        finalFocus={returnFocus}
      >
        <div className="flex shrink-0 items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="mt-0 mb-1 text-xs text-u-muted">
              {resource.kind === 'lecturer' ? 'Преподаватель' : 'Аудитория'}
            </p>
            <Dialog.Title className="m-0 text-lg leading-snug wrap-anywhere">
              {resource.label}
            </Dialog.Title>
            {resource.description && (
              <p className="mt-1 mb-0 text-xs text-u-muted wrap-anywhere">
                {resource.description}
              </p>
            )}
          </div>
          <Dialog.Close
            render={
              <IconButton
                name="close"
                label="Вернуться к сравнению"
                className="size-11 min-h-11 min-w-11 shrink-0"
              />
            }
          />
        </div>
        <Dialog.Description className="sr-only">
          Занятия {resource.kind === 'lecturer' ? 'преподавателя' : 'аудитории'}
          . Выбранные группы сравнения не меняются.
        </Dialog.Description>
        <div className="mt-2 flex shrink-0 items-center gap-0.5">
          <IconButton
            name="left"
            label="Предыдущая неделя объекта"
            className="size-11 min-h-11 min-w-11 shrink-0"
            onClick={() => selectDay(addDays(day, -7))}
          />
          <Popover.Root open={dateOpen} onOpenChange={setDateOpen}>
            <Popover.Trigger
              render={
                <Button
                  variant="ghost"
                  className="min-h-11 min-w-0 flex-1 px-1 text-xs"
                  aria-label={`Выбрать дату объекта. ${weekLabel(week)}`}
                />
              }
            >
              <span className="truncate">{weekLabel(week)}</span>
              <Icon name="down" size={12} />
            </Popover.Trigger>
            <Popover.Content
              className="w-[min(340px,calc(100vw-24px))] p-3"
              positionerProps={{ sideOffset: 5 }}
            >
              <DatePicker
                day={day}
                onSelect={(value) => {
                  selectDay(value);
                  setDateOpen(false);
                }}
              />
            </Popover.Content>
          </Popover.Root>
          <IconButton
            name="right"
            label="Следующая неделя объекта"
            className="size-11 min-h-11 min-w-11 shrink-0"
            onClick={() => selectDay(addDays(day, 7))}
          />
          <Button
            variant="ghost"
            className="min-h-11 px-1 text-xs underline"
            onClick={() => selectDay(omskToday())}
          >
            Сегодня
          </Button>
        </div>
        <nav
          className="resource-days -mx-3 mt-1 grid shrink-0 grid-cols-7"
          aria-label="Дни расписания объекта"
          ref={days}
        >
          {Array.from({ length: 7 }, (_, index) => addDays(week, index)).map(
            (date, index) => (
              <button
                key={date}
                type="button"
                data-resource-day={date}
                className={`flex min-h-11 min-w-0 cursor-pointer flex-col items-center justify-center rounded-u-control border bg-transparent p-0 text-xs focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-u-ink ${date === day ? 'border-u-selection-border bg-u-selection text-u-selection-ink' : 'border-transparent hover:bg-u-well'}`}
                aria-label={formatDay(date, {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
                aria-pressed={date === day}
                onClick={() => selectDay(date)}
                onKeyDown={(event) => {
                  const next =
                    event.key === 'ArrowLeft'
                      ? Math.max(0, index - 1)
                      : event.key === 'ArrowRight'
                        ? Math.min(6, index + 1)
                        : event.key === 'Home'
                          ? 0
                          : event.key === 'End'
                            ? 6
                            : undefined;
                  if (
                    next === undefined ||
                    event.altKey ||
                    event.ctrlKey ||
                    event.metaKey
                  )
                    return;
                  event.preventDefault();
                  selectDay(addDays(week, next), true);
                }}
              >
                <span className="text-[10px]">
                  {formatDay(date, { weekday: 'short' })}
                </span>
                <strong className="text-sm">{Number(date.slice(8))}</strong>
              </button>
            ),
          )}
        </nav>
        <div
          className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain [@media(max-height:500px)]:overflow-visible"
          role="region"
          aria-label="Занятия объекта"
          tabIndex={0}
          aria-busy={query.isFetching}
        >
          <p className="mt-0 mb-3 text-xs text-u-muted" role="status">
            {query.isFetching
              ? snapshot
                ? 'Проверяем обновления…'
                : 'Загружаем расписание…'
              : saved
                ? `Сохранённые данные · ${checked}`
                : checked
                  ? `Проверено ${checked}`
                  : 'Данные недоступны'}{' '}
            · Омск, UTC+6
          </p>
          {saved && (
            <p className="my-2 flex items-center gap-1 text-xs text-u-muted">
              <Icon name="clock" size={13} />
              Сохранённые занятия могут отличаться от текущего расписания.
            </p>
          )}
          {query.error && (
            <div
              className="mb-3 rounded-u-control border border-u-line p-3"
              role="alert"
            >
              <p className="mt-0 mb-2 text-sm">{query.error.message}</p>
              <Button
                size="sm"
                variant="secondary"
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                Повторить
              </Button>
            </div>
          )}
          {query.isPending && !snapshot ? (
            <div className="grid gap-3" aria-label="Загрузка занятий">
              {[0, 1, 2].map((n) => (
                <Skeleton key={n} className="h-24 w-full" />
              ))}
            </div>
          ) : snapshot ? (
            entries.length ? (
              <ol className="m-0 list-none space-y-4 p-0">
                {[...intervals.values()].map((lessons) => (
                  <li key={`${lessons[0].start}:${lessons[0].end}`}>
                    <h3 className="mt-0 mb-2 text-xs font-bold tabular-nums">
                      <time>{timeLabel(lessons[0].start)}</time>–
                      <time>{timeLabel(lessons[0].end)}</time>
                      {lessons.length > 1 && (
                        <span className="ml-2 text-[11px] font-normal text-u-muted">
                          Параллельно · {lessons.length}
                        </span>
                      )}
                    </h3>
                    <ol className="m-0 list-none divide-y divide-u-line-soft overflow-hidden rounded-u-control border border-u-line p-0">
                      {lessons.map((lesson, index) => {
                        const teacher = teacherLabel(lesson, resource);
                        return (
                          <li
                            key={`${lesson.id}:${index}`}
                            className={`resource-lesson p-3 motion-safe:animate-lesson-appear motion-safe:transition-colors motion-safe:duration-300 motion-safe:ease-out ${saved ? 'bg-u-surface' : 'bg-u-raised'} ${lesson.remote ? 'border-2 border-dashed border-u-muted' : ''}`}
                          >
                            <h4 className="m-0 text-sm leading-snug font-bold wrap-anywhere">
                              {lesson.subject}
                            </h4>
                            {lesson.audience && (
                              <p className="mt-1.5 mb-0 text-xs wrap-anywhere">
                                {lesson.audience}
                              </p>
                            )}
                            <p className="mt-1.5 mb-0 text-xs leading-relaxed text-u-muted wrap-anywhere">
                              {lesson.remote
                                ? 'Онлайн'
                                : [lesson.building, lesson.room]
                                    .filter(Boolean)
                                    .join(' · ') || 'Аудитория не указана'}{' '}
                              · {lesson.kind || 'Тип занятия не указан'}
                              {teacher && <> · {teacher}</>}
                            </p>
                          </li>
                        );
                      })}
                    </ol>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="my-8 text-sm text-u-muted">
                {saved
                  ? 'По сохранённым данным на этот день занятий нет.'
                  : 'На этот день занятий по расписанию нет.'}
              </p>
            )
          ) : (
            !query.error && (
              <div className="my-5">
                <p className="text-sm text-u-muted">
                  Сохранённые данные устарели. Нужен ответ источника.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={query.isFetching}
                  onClick={() => void query.refetch()}
                >
                  Повторить загрузку
                </Button>
              </div>
            )
          )}
        </div>
        <p className="mt-2 mb-0 shrink-0 border-t border-u-line-soft pt-2 text-[11px] leading-relaxed text-u-muted">
          {resource.kind === 'auditorium'
            ? 'Показана занятость по расписанию. Доступность аудитории для других занятий нужно уточнять.'
            : 'Показаны учебные занятия; другая занятость преподавателя здесь не учитывается.'}{' '}
          Для первого открытия нужна сеть.
        </p>
      </Dialog.Content>
    </Dialog.Root>
  );
}

function teacherLabel(lesson: Lesson, resource: ResourceRef) {
  const teachers = lesson.teachers;
  if (
    resource.kind === 'lecturer' &&
    teachers?.some(
      (teacher) => teacher.kind === resource.kind && teacher.id === resource.id,
    )
  ) {
    return teachers
      .filter(
        (teacher) =>
          teacher.kind !== resource.kind || teacher.id !== resource.id,
      )
      .map((teacher) => teacher.label)
      .join(', ');
  }
  return lesson.teacher || teachers?.map((teacher) => teacher.label).join(', ');
}
