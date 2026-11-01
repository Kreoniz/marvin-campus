import { useEffect, useState } from 'react';
import { timeLabel } from '../../../lib/dates.ts';
import type { GroupSchedule } from '../../../lib/types.ts';
import { currentOrNextLessons } from '../../../lib/current-lesson.ts';

export default function CurrentLesson({
  schedules,
  day,
}: {
  schedules: GroupSchedule[];
  day: string;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = setTimeout(update, 60_000 - (Date.now() % 60_000));
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [now]);
  const result = currentOrNextLessons(schedules, day, now);
  if (!result) return null;
  return (
    <p
      className="m-0 border-b border-u-line-soft px-3 py-2 text-xs text-u-muted"
      role="status"
    >
      <span className="font-semibold">
        Сегодня · Омск ·{' '}
        {result.state === 'lesson'
          ? 'Сейчас'
          : result.state === 'between'
            ? 'Далее'
            : result.hadLessons
              ? 'Занятия завершены'
              : 'Занятий нет'}
      </span>
      {result.lessons.length > 1 && ' · Параллельные занятия'}
      {result.lessons.map((lesson, index) => (
        <span className="mt-0.5 block wrap-anywhere" key={index}>
          {timeLabel(lesson.start)}–{timeLabel(lesson.end)} · {lesson.subject}
          {lesson.remote
            ? ' · Дистанционно'
            : [lesson.building, lesson.room].filter(Boolean).length > 0
              ? ` · ${[lesson.building, lesson.room].filter(Boolean).join(', ')}`
              : ''}
        </span>
      ))}
      {schedules[0].selection.kind === 'vuc' ? (
        <span className="mt-0.5 block">
          По локальному документу · актуальность сайта не проверена
        </span>
      ) : result.saved ? (
        <span className="mt-0.5 block">По сохранённым данным</span>
      ) : null}
    </p>
  );
}
