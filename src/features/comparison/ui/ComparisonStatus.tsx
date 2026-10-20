import { Button } from 'unlikely-ui/button';
import { Input } from 'unlikely-ui/input';
import { Popover } from 'unlikely-ui/popover';
import type { GroupSchedule } from '../../../lib/types.ts';
import type { ComparisonLinks } from '../model/use-comparison.ts';
import IconButton from '../../../shared/ui/IconButton.tsx';
import Icon from '../../../shared/ui/Icon.tsx';

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
  fetching,
  links,
}: {
  schedules: GroupSchedule[];
  fetching: boolean;
  links: ComparisonLinks;
}) {
  const checked = schedules
    .flatMap((g) => (g.snapshot ? [g.snapshot.checkedAt] : []))
    .sort()[0];
  const saved = schedules.some(
    (g) => g.snapshot && (g.snapshot.stale || g.error),
  );
  const missing = schedules.some((g) => !g.snapshot && !g.loading);
  const message = fetching
    ? saved
      ? 'Проверяем… · сохранённые данные'
      : checked
        ? 'Проверяем обновления…'
        : 'Загружаем расписания…'
    : missing
      ? 'Часть расписаний недоступна'
      : saved
        ? `Сохранённые данные${checked ? ` · ${checkedLabel(checked)}` : ''}`
        : checked
          ? `Проверено ${checkedLabel(checked)}`
          : 'Расписание недоступно';
  return (
    <>
      <div className="data-status">
        <span className="status-message" role="status" aria-atomic="true">
          {saved && <Icon name="clock" size={13} />}
          <span
            title={
              checked
                ? `${message}. Проверено ${checkedLabel(checked)}. Омск, UTC+6.`
                : message
            }
          >
            {message}
            <span className="timezone"> · Омск, UTC+6</span>
          </span>
        </span>
        <div className="status-actions">
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
              className="data-details"
              positionerProps={{ sideOffset: 6 }}
            >
              <div className="data-details-heading">
                <Popover.Title>Данные расписания</Popover.Title>
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
              <p>
                Время по Омску, UTC+6. Сохранённые данные могут отличаться от
                текущего расписания.
              </p>
              {schedules.map((group) => (
                <div key={group.selection.id} className="group-data-status">
                  <strong>{group.selection.label}</strong>
                  <p>
                    {group.error ??
                      group.snapshot?.warning ??
                      (group.loading
                        ? 'Загружаем расписание…'
                        : group.snapshot?.stale
                          ? 'Показаны сохранённые данные.'
                          : group.snapshot
                            ? 'Данные актуальны.'
                            : 'Нет сохранённых данных.')}
                  </p>
                  {group.snapshot && (
                    <p>Проверено {checkedLabel(group.snapshot.checkedAt)}.</p>
                  )}
                </div>
              ))}
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
        <div className="manual-share">
          <label htmlFor="share-link">Ссылка на сравнение</label>
          <Input
            id="share-link"
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
