import { useState } from 'react';
import { Button } from 'unlikely-ui/button';
import { Popover } from 'unlikely-ui/popover';
import { RadioGroup } from 'unlikely-ui/radio-group';
import { track } from '../lib/analytics.ts';
import type { ComparisonView } from '../lib/use-comparison.ts';
import type { Mode } from '../lib/types.ts';
import { addDays, formatDay, omskToday, weekLabel } from '../lib/dates.ts';
import DatePicker from './LazyDatePicker.tsx';
import Icon from './Icon.tsx';

interface Props {
  view: ComparisonView;
  opening: boolean;
  mobileView?: 'day' | 'week';
  onMobileViewChange: (value: 'day' | 'week') => void;
}
export default function MobileDayNav({
  view,
  opening,
  mobileView = 'day',
  onMobileViewChange,
}: Props) {
  const [dateOpen, setDateOpen] = useState(false);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(view.week, i));
  const last = addDays(view.week, 6);
  const shortWeek =
    view.week.slice(0, 7) === last.slice(0, 7)
      ? `${Number(view.week.slice(8))}–${formatDay(last, { day: 'numeric', month: 'short' })}`
      : `${formatDay(view.week, { day: 'numeric', month: 'short' })}–${formatDay(last, { day: 'numeric', month: 'short' })}`;
  function selectView(value: 'day' | 'week') {
    if (value !== mobileView) {
      onMobileViewChange(value);
      track('mobile_view_changed', { view: value });
    }
  }
  return (
    <>
      <div className="mobile-view-controls" inert={opening}>
        <div className="mobile-week-controls" data-schedule-week>
          <Button
            variant="ghost"
            size="icon-sm"
            className="week-arrow"
            aria-label="Предыдущая неделя"
            onClick={() => view.selectWeek(addDays(view.week, -7))}
          >
            <Icon name="left" size={17} />
          </Button>
          <Popover.Root open={dateOpen} onOpenChange={setDateOpen}>
            <Popover.Trigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  className="mobile-date"
                  aria-label={`Выбрать дату. ${weekLabel(view.week)}`}
                />
              }
            >
              <span>{shortWeek}</span>
              <Icon name="down" size={12} />
            </Popover.Trigger>
            <Popover.Content
              className="week-popover"
              positionerProps={{ sideOffset: 6 }}
            >
              <DatePicker
                day={view.day}
                onSelect={(value) => {
                  view.selectDate(value);
                  setDateOpen(false);
                }}
              />
            </Popover.Content>
          </Popover.Root>
          <Button
            variant="ghost"
            size="icon-sm"
            className="week-arrow"
            aria-label="Следующая неделя"
            onClick={() => view.selectWeek(addDays(view.week, 7))}
          >
            <Icon name="right" size={17} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="today-button"
            onClick={() => view.selectDate(omskToday())}
          >
            Сегодня
          </Button>
        </div>
        <RadioGroup.Root
          className="view-toggle"
          variant="segmented"
          aria-label="Представление расписания"
          value={mobileView}
          onValueChange={(value) => selectView(value as 'day' | 'week')}
        >
          <RadioGroup.Item value="day">День</RadioGroup.Item>
          <RadioGroup.Item value="week">Неделя</RadioGroup.Item>
        </RadioGroup.Root>
      </div>
      <nav
        className="agenda-days"
        data-schedule-days
        aria-label="Дни недели"
        inert={opening}
      >
        {dates.map((date) => (
          <Button
            key={date}
            variant="ghost"
            className={view.day === date && !opening ? 'selected' : ''}
            data-schedule-day={date}
            aria-pressed={view.day === date && !opening}
            aria-label={formatDay(date, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
            onClick={() => view.selectDay(date)}
          >
            {opening ? (
              <span
                className="skeleton day-label-placeholder"
                aria-hidden="true"
              />
            ) : (
              <>
                <span>{formatDay(date, { weekday: 'short' })}</span>
                <strong>{Number(date.slice(8))}</strong>
              </>
            )}
          </Button>
        ))}
      </nav>
      {view.groups.length >= 2 && (
        <div className="mobile-modes-wrap" inert={opening}>
          <RadioGroup.Root
            className="mobile-modes"
            variant="segmented"
            aria-label="Режим сравнения"
            value={view.mode}
            onValueChange={(value) => view.selectMode(value as Mode)}
          >
            <RadioGroup.Item value="presence">В вузе</RadioGroup.Item>
            <RadioGroup.Item value="free">Без занятий</RadioGroup.Item>
          </RadioGroup.Root>
        </div>
      )}
    </>
  );
}
