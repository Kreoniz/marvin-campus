import { useState } from 'react';
import { Button } from 'unlikely-ui/button';
import { Calendar, ru } from 'unlikely-ui/calendar';
import { addDays, monday, omskToday, weekLabel } from '../lib/dates.ts';

// The calendar uses local calendar dates; schedule URLs use Omsk date strings.
const localDate = (day: string) =>
  new Date(
    Number(day.slice(0, 4)),
    Number(day.slice(5, 7)) - 1,
    Number(day.slice(8)),
    12,
  );
const dateString = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function DatePicker({
  day,
  onSelect,
}: {
  day: string;
  onSelect: (day: string) => void;
}) {
  const [previewWeek, setPreviewWeek] = useState('');
  const today = omskToday();
  return (
    <div className="campus-date-picker">
      <Calendar
        selected={localDate(day)}
        defaultMonth={localDate(day)}
        today={localDate(today)}
        onSelect={(date) => {
          if (date) onSelect(dateString(date));
        }}
        locale={ru}
        weekStartsOn={1}
        highlightWeek
        autoFocus
        disabled={{
          before: localDate(addDays(today, -730)),
          after: localDate(addDays(today, 730)),
        }}
        startMonth={localDate(addDays(today, -730))}
        endMonth={localDate(addDays(today, 730))}
        aria-label="Выбор даты расписания"
        labels={{
          labelNext: () => 'Следующий месяц',
          labelPrevious: () => 'Предыдущий месяц',
          labelNav: () => 'Навигация по месяцам',
          labelGrid: (date) =>
            `Выбор даты: ${date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`,
        }}
        onDayMouseEnter={(date) => setPreviewWeek(monday(dateString(date)))}
        onDayMouseLeave={() => setPreviewWeek('')}
        onDayFocus={(date) => setPreviewWeek(monday(dateString(date)))}
        onDayBlur={() => setPreviewWeek('')}
      />
      <p className="date-picker-week-label" aria-live="polite">
        Неделя: {weekLabel(previewWeek || monday(day))}
      </p>
      <Button
        variant="secondary"
        className="date-picker-today"
        onClick={() => onSelect(today)}
      >
        Сегодня
      </Button>
    </div>
  );
}
