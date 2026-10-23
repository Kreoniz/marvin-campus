import { useState } from 'react';
import { Button } from 'unlikely-ui/button';
import { Popover } from 'unlikely-ui/popover';
import { RadioGroup } from 'unlikely-ui/radio-group';
import { track } from '../../../lib/analytics.ts';
import type { ComparisonView } from '../model/use-comparison.ts';
import {
  addDays,
  formatDay,
  omskToday,
  weekLabel,
} from '../../../lib/dates.ts';
import DatePicker from './LazyDatePicker.tsx';
import Icon from '../../../shared/ui/Icon.tsx';

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
    <div className="mobile-navigation min-[701px]:grid min-[701px]:grid-cols-2 min-[701px]:items-center">
      <div
        className="mobile-view-controls flex items-center gap-1.5 px-1.5"
        inert={opening}
      >
        <div
          className="mobile-week-controls flex min-w-0 flex-1 items-center"
          data-schedule-week
        >
          <Button
            variant="ghost"
            size="icon-sm"
            className="week-arrow size-11 min-h-11 min-w-11 shrink-0 p-1"
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
                  className="mobile-date min-h-11 min-w-0 flex-1 gap-[3px] px-[3px] py-1.5 text-[13px] [&>.u-button-label]:w-full [&>.u-button-label]:min-w-0 [&>.u-button-label]:gap-[3px] [&>.u-button-label>span]:min-w-0 [&>.u-button-label>span]:text-balance [&>.u-button-label>span]:whitespace-normal [&>.u-button-label>span]:leading-[1.15] [&>.u-button-label>svg]:shrink-0"
                  aria-label={`Выбрать дату. ${weekLabel(view.week)}`}
                />
              }
            >
              <span>{shortWeek}</span>
              <Icon name="down" size={12} />
            </Popover.Trigger>
            <Popover.Content
              aria-label="Выбор даты расписания"
              className="week-popover w-[min(340px,calc(100vw-24px))] p-3"
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
            className="week-arrow size-11 min-h-11 min-w-11 shrink-0 p-1"
            aria-label="Следующая неделя"
            onClick={() => view.selectWeek(addDays(view.week, 7))}
          >
            <Icon name="right" size={17} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="today-button min-h-11 min-w-0 shrink-0 px-1 text-xs max-[360px]:hidden underline underline-offset-[3px]"
            onClick={() => view.selectDate(omskToday())}
          >
            Сегодня
          </Button>
        </div>
        <RadioGroup.Root
          className="view-toggle shrink-0 gap-0 p-0.5 [&_.u-segmented-item]:min-h-10 [&_.u-segmented-item]:px-[7px] [&_.u-segmented-item]:text-xs"
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
        className="agenda-days grid grid-cols-7 gap-0.5 px-2 pb-1 min-[701px]:pb-0"
        data-schedule-days
        aria-label="Дни недели"
        inert={opening}
      >
        {dates.map((date) => (
          <Button
            key={date}
            variant="ghost"
            className={`flex h-11 min-h-11 min-w-0 flex-col items-center justify-center gap-px border px-0 py-[3px] text-[11px] [&>.u-button-label]:w-full [&>.u-button-label]:min-w-0 [&>.u-button-label]:flex-col [&>.u-button-label]:gap-px [&>.u-button-label>span]:leading-[14px] ${view.day === date && !opening ? 'selected border-u-selection-border bg-u-selection text-u-selection-ink' : 'border-transparent'}`}
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
                className="inline-block h-6 w-[26px] animate-pulse rounded-u-control bg-u-well align-middle motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <>
                <span>{formatDay(date, { weekday: 'short' })}</span>
                <strong className="text-[15px] leading-[18px]">
                  {Number(date.slice(8))}
                </strong>
              </>
            )}
          </Button>
        ))}
      </nav>
    </div>
  );
}
