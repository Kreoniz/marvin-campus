import { useLayoutEffect, useRef, useState } from 'react';
import { compactVucLabel } from '../../lib/schedule-ref.ts';
import useMilitarySchedule from './use-military-schedule.ts';

export default function MilitaryInline({
  date,
  onVisibleEntriesChange,
}: {
  date: string;
  onVisibleEntriesChange: (count: number) => void;
}) {
  const {
    ref,
    result,
    snapshot,
    lessons,
    covered,
    unresolved,
    times,
    catalogue,
    expired,
  } = useMilitarySchedule(date);
  const body = useRef<HTMLSpanElement>(null);
  const entries = useRef<HTMLSpanElement>(null);
  const [capacity, setCapacity] = useState(0);
  const hasSnapshot = !!snapshot;
  const contentKey = JSON.stringify(
    lessons.map((lesson) => [
      lesson.id,
      times(lesson),
      lesson.subject,
      lesson.room,
      lesson.teacher,
    ]),
  );
  useLayoutEffect(() => {
    const viewport = body.current;
    const list = entries.current;
    if (!viewport || !list) {
      onVisibleEntriesChange(0);
      return;
    }
    const measure = () => {
      if (!viewport.isConnected) return;
      const rows = Array.from(list.children) as HTMLElement[];
      const count =
        viewport.clientHeight > 0
          ? rows.filter(
              (row) =>
                row.offsetTop + row.offsetHeight <= viewport.clientHeight,
            ).length
          : 0;
      setCapacity(count);
      onVisibleEntriesChange(count);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    observer.observe(list);
    void document.fonts.ready.then(measure);
    return () => observer.disconnect();
  }, [contentKey, hasSnapshot, onVisibleEntriesChange]);
  return (
    <span className="military-inline relative z-[1] mt-2 hidden min-h-0 flex-1 flex-col border-t border-u-line-soft pt-2 text-[10px] leading-[1.35] [@container(height>=240px)]:flex">
      <strong className="line-clamp-1 shrink-0 text-xs">
        {ref ? compactVucLabel(ref.label) : 'Расписание ВУЦ'}
      </strong>
      {!ref ? (
        <span className="mt-1 block">
          {catalogue.isError || expired
            ? 'Список ВУЦ недоступен · подробнее →'
            : 'Выбрать в подробностях →'}
        </span>
      ) : result.isPending && !snapshot ? (
        <span className="mt-1 block">Загрузка…</span>
      ) : !snapshot ? (
        <span className="mt-1 block">Нет доступных данных · подробнее →</span>
      ) : (
        <>
          <span className="military-status mt-1 block shrink-0 opacity-80">
            {!covered || unresolved
              ? 'Документ · данные неполные'
              : !lessons.length
                ? 'По документу занятий нет'
                : 'По документу'}
            {result.error ? ' · сохранённые данные' : ''}
          </span>
          <span
            ref={body}
            className="military-body relative min-h-0 flex-1 overflow-hidden"
          >
            <span ref={entries} className="absolute inset-x-0 top-0 block">
              {lessons.map((lesson, index) => (
                <span
                  className="military-entry mt-2 block border-l-2 border-u-line pl-1.5"
                  key={lesson.id}
                  style={{
                    visibility: index < capacity ? 'visible' : 'hidden',
                  }}
                  aria-hidden={index >= capacity}
                >
                  <span className="block tabular-nums">{times(lesson)}</span>
                  <strong className="line-clamp-2">{lesson.subject}</strong>
                  {(lesson.room || lesson.teacher) && (
                    <span className="line-clamp-2">
                      {[lesson.room, lesson.teacher]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </span>
              ))}
            </span>
          </span>
          <span className="military-remainder block min-h-[14px] shrink-0">
            {lessons.length > capacity
              ? `Ещё ${lessons.length - capacity} · подробнее →`
              : ''}
          </span>
        </>
      )}
    </span>
  );
}
