import { Button } from 'unlikely-ui/button';
import { Input } from 'unlikely-ui/input';
import { Popover } from 'unlikely-ui/popover';
import type { GroupSchedule } from '../../../lib/types.ts';
import { scheduleKey } from '../../../lib/schedule-ref.ts';
import { comparisonIssue } from '../../../lib/domain.ts';
import { scheduleLabels } from '../../../lib/selection-labels.ts';
import type { ComparisonLinks } from '../model/use-comparison.ts';
import IconButton from '../../../shared/ui/IconButton.tsx';
import Icon from '../../../shared/ui/Icon.tsx';
import VucScheduleNotes from '../../resources/VucScheduleNotes.tsx';

const checkedLabel = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Asia/Omsk',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
export default function ComparisonStatus({
  schedules,
  day,
  fetching,
  links,
}: {
  schedules: GroupSchedule[];
  day?: string;
  fetching: boolean;
  links: ComparisonLinks;
}) {
  const label = scheduleLabels(schedules);
  const checked = schedules
    .flatMap((g) => (g.snapshot ? [g.snapshot.checkedAt] : []))
    .sort()[0];
  const saved = schedules.some(
    (g) => g.snapshot && (g.snapshot.stale || g.error),
  );
  const missing = schedules.some((g) => !g.snapshot && !g.loading);
  const unresolved = schedules.some(
    (g) => comparisonIssue(g, day) === 'subgroup',
  );
  const commonCheck =
    checked &&
    schedules.every(
      (group) =>
        group.selection.kind !== 'vuc' &&
        group.snapshot &&
        !group.loading &&
        !group.error &&
        !group.snapshot.warning &&
        !group.snapshot.stale &&
        checkedLabel(group.snapshot.checkedAt) === checkedLabel(checked),
    );
  const message = fetching
    ? saved
      ? 'Проверяем… · сохранённые данные'
      : checked
        ? 'Проверяем обновления…'
        : 'Загружаем расписания…'
    : unresolved
      ? 'Подгруппа не определена · расчёт ограничен'
      : missing
        ? 'Часть расписаний недоступна'
        : saved
          ? `Сохранённые данные${checked ? ` · ${checkedLabel(checked)}` : ''}`
          : checked
            ? `Проверено ${checkedLabel(checked)}`
            : 'Расписание недоступно';
  return (
    <>
      <div className="data-status flex min-h-11 min-w-0 items-center justify-between gap-2 px-3.5 compact:pl-[9px]">
        <span
          className="status-message flex min-w-0 items-center gap-[5px] text-[11px] text-u-muted"
          role="status"
          aria-atomic="true"
        >
          {saved && <Icon name="clock" size={13} />}
          <span
            className="truncate"
            title={
              checked
                ? `${message}. Проверено ${checkedLabel(checked)}. Омск, UTC+6.`
                : message
            }
          >
            {message}
            <span className="timezone compact:hidden"> · Омск, UTC+6</span>
          </span>
        </span>
        <div className="status-actions flex shrink-0 gap-0.5 compact:[&_.icon-button]:min-h-11 compact:[&_.icon-button]:min-w-11">
          <Popover.Root>
            <Popover.Trigger
              render={
                <IconButton
                  name="info"
                  label="Состояние данных расписания"
                  size={17}
                />
              }
            />
            <Popover.Content
              className="data-details max-h-[min(420px,calc(100dvh-32px))] w-[min(380px,calc(100vw-24px))] overflow-auto p-4 text-sm"
              positionerProps={{ sideOffset: 6 }}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <Popover.Title className="m-0 pt-2 text-lg leading-6">
                  Данные расписания
                </Popover.Title>
                <Popover.Close
                  render={
                    <IconButton
                      name="close"
                      label="Закрыть состояние данных"
                      size={16}
                    />
                  }
                />
              </div>
              <p className="mb-3 text-xs leading-[18px] text-u-muted">
                {commonCheck ? `Проверено ${checkedLabel(checked)}. ` : ''}Омск,
                UTC+6.
                {saved &&
                  ' Сохранённые данные могут отличаться от текущего расписания.'}
              </p>
              <ul className="m-0 list-none divide-y divide-[var(--u-line-soft)] p-0">
                {schedules.map((group) => {
                  const snapshot = group.snapshot;
                  const warning = group.error ?? snapshot?.warning;
                  const unresolved = comparisonIssue(group, day) === 'subgroup';
                  const imported = group.selection.kind === 'vuc';
                  const coverage = comparisonIssue(group, day) === 'coverage';
                  const state = group.loading
                    ? 'Загружаем…'
                    : coverage
                      ? 'Нет подтверждённых данных на день'
                      : unresolved
                        ? 'Не учтена в расчёте'
                        : snapshot
                          ? imported
                            ? 'Из документа'
                            : snapshot.stale || warning
                              ? 'Сохранено'
                              : 'Актуально'
                          : 'Недоступно';
                  return (
                    <li
                      key={scheduleKey(group.selection)}
                      className="group-data-status py-2.5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                        <strong className="text-sm font-semibold">
                          {label(group.selection)}
                        </strong>
                        <span className="text-xs text-u-muted">{state}</span>
                      </div>
                      {unresolved && (
                        <p className="mt-1 text-xs leading-[18px] text-u-ink">
                          Не удалось определить подгруппу{' '}
                          {group.selection.subgroupNumber}. Известные занятия
                          показаны, но группа исключена из расчёта.
                        </p>
                      )}
                      {warning && (
                        <p className="mt-1 text-xs leading-[18px] text-u-muted">
                          {warning}
                        </p>
                      )}
                      {imported && (
                        <VucScheduleNotes schedule={group} date={day} />
                      )}
                      {!snapshot && !group.loading && !warning && (
                        <p className="mt-1 text-xs text-u-muted">
                          Нет сохранённых данных.
                        </p>
                      )}
                      {snapshot && (
                        <time
                          dateTime={snapshot.checkedAt}
                          title={new Intl.DateTimeFormat('ru-RU', {
                            timeZone: 'Asia/Omsk',
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          }).format(new Date(snapshot.checkedAt))}
                          className={
                            commonCheck
                              ? 'sr-only'
                              : 'mt-1 block text-xs text-u-muted'
                          }
                        >
                          {imported ? 'Импортирован' : 'Проверено'}{' '}
                          {checkedLabel(
                            snapshot.data.importedAt || snapshot.checkedAt,
                          )}
                          .
                        </time>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Popover.Content>
          </Popover.Root>
          <IconButton
            label={
              links.sharing
                ? 'Копируем ссылку…'
                : 'Скопировать ссылку на сравнение'
            }
            disabled={links.sharing || links.opening}
            name="copy"
            size={17}
            onClick={links.copy}
          />
        </div>
      </div>
      {links.manual && (
        <div className="manual-share flex flex-wrap items-center gap-2 border-t border-[var(--u-line-soft)] px-4 py-3 text-xs">
          <label htmlFor="share-link">Ссылка на сравнение</label>
          <Input
            id="share-link"
            className="min-w-0 flex-[1_1_220px]"
            readOnly
            value={links.manual}
            onFocus={(event) => event.currentTarget.select()}
          />
          <Button variant="secondary" onClick={links.copyManual}>
            Копировать
          </Button>
        </div>
      )}
    </>
  );
}
