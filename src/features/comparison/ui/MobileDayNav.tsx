import { useState } from 'react';
import { Button } from 'unlikely-ui/button';
import { Popover } from 'unlikely-ui/popover';
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
  vucOnly?: boolean;
  view: ComparisonView;
  opening: boolean;
  showWeekControls?: boolean;
  onToday: () => void;
}
export default function MobileDayNav({
  vucOnly = false,
  view,
  opening,
  showWeekControls = true,
  onToday,
}: Props) {
  const [dateOpen, setDateOpen] = useState(false);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(view.week, i));
  const shortWeek = weekLabel(view.week, true);
  return (
    <div className="mobile-navigation">
      {showWeekControls && (
        <div
          className="mobile-view-controls flex items-center px-2"
          inert={opening}
        >
          <div
            className="mobile-week-controls grid min-w-0 flex-1 grid-cols-[44px_52px_minmax(0,1fr)_52px_44px] items-center"
            data-schedule-week
          >
            <Button
              variant="ghost"
              size="icon-sm"
              className="week-arrow col-start-1 row-start-1 size-11 min-h-11 min-w-11 shrink-0 p-1"
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
                    className="mobile-date col-start-3 row-start-1 min-h-11 min-w-0 flex-1 gap-[3px] px-[3px] py-1.5 text-[13px] [&>.u-button-label]:w-full [&>.u-button-label]:min-w-0 [&>.u-button-label]:justify-center [&>.u-button-label]:gap-[3px] [&>.u-button-label>span]:min-w-0 [&>.u-button-label>span]:whitespace-normal [&>.u-button-label>span]:leading-[1.15] [&>.u-button-label>svg]:shrink-0"
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
                    if (value === omskToday()) onToday();
                    else view.selectDate(value);
                    setDateOpen(false);
                  }}
                />
              </Popover.Content>
            </Popover.Root>
            <Button
              variant="ghost"
              size="icon-sm"
              className="week-arrow col-start-5 row-start-1 size-11 min-h-11 min-w-11 shrink-0 p-1"
              aria-label="Следующая неделя"
              onClick={() => view.selectWeek(addDays(view.week, 7))}
            >
              <Icon name="right" size={17} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="today-button col-start-2 row-start-1 min-h-11 min-w-0 shrink-0 px-1 text-xs underline underline-offset-[3px]"
              onClick={onToday}
            >
              Сегодня
            </Button>
            <a
              href={vucOnly ? '/' : '/vuc'}
              className="col-start-4 row-start-1 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-sm text-xs underline underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-u-ink"
              aria-label={vucOnly ? 'Все расписания' : 'Расписания ВУЦ'}
            >
              {vucOnly ? 'Все' : 'ВУЦ'}
            </a>
          </div>
        </div>
      )}
      <nav
        className="agenda-days grid grid-cols-7 gap-0 pb-1 min-[701px]:pb-0"
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
