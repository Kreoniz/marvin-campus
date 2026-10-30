import { compactVucLabel } from '../../lib/schedule-ref.ts';
import useMilitarySchedule from './use-military-schedule.ts';

export default function MilitaryInline({ date }: { date: string }) {
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
  return (
    <span className="military-inline relative z-[1] mt-2 hidden border-t border-u-line-soft pt-2 text-[10px] leading-[1.35] [@container(height>=320px)]:block">
      <strong className="block text-xs">
        {ref ? `Моё ${compactVucLabel(ref.label)}` : 'Моё расписание ВУЦ'}
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
          {lessons.slice(0, 4).map((lesson, index) => (
            <span
              className={`mt-2 border-l-2 border-u-line pl-1.5 ${index < 2 ? 'block' : 'hidden [@container(height>=520px)]:block'}`}
              key={lesson.id}
            >
              <span className="line-clamp-3 tabular-nums">{times(lesson)}</span>
              <strong className="line-clamp-2 block">{lesson.subject}</strong>
              {lesson.room && (
                <span className="line-clamp-1">{lesson.room}</span>
              )}
            </span>
          ))}
          {lessons.length > 2 && (
            <span className="mt-1 block [@container(height>=520px)]:hidden">
              Ещё {lessons.length - 2} · подробнее →
            </span>
          )}
          {lessons.length > 4 && (
            <span className="mt-1 hidden [@container(height>=520px)]:block">
              Ещё {lessons.length - 4} · подробнее →
            </span>
          )}
          <span className="mt-2 block opacity-80">
            {!covered || unresolved
              ? 'Документ · данные неполные'
              : !lessons.length
                ? 'По документу занятий нет'
                : 'По документу'}
            {result.error ? ' · сохранённые данные' : ''}
          </span>
        </>
      )}
    </span>
  );
}
