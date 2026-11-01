import { dayContent } from '../../../lib/day-content.ts';
import type { GroupSchedule, ScheduleKind } from '../../../lib/types.ts';

export default function DayEmpty({
  schedules,
  day,
  hiddenKinds = [],
}: {
  schedules: GroupSchedule[];
  day: string;
  hiddenKinds?: ScheduleKind[];
}) {
  const content = dayContent(schedules, day, hiddenKinds);
  return (
    <>
      {content.hiddenLessons
        ? 'Занятия выбранных видов скрыты.'
        : content.knownEmpty
          ? 'В этот день занятий нет.'
          : content.loading
            ? 'Загружаем расписания…'
            : content.unavailable
              ? 'Данные расписания недоступны.'
              : 'Нет подтверждённых данных на этот день.'}
      {content.hiddenLessons &&
        content.issues.length > 0 &&
        ' Данные части расписаний не подтверждены.'}
      {content.issues.includes('subgroup') && ' Подгруппа не определена.'}
      {content.issues.includes('coverage') &&
        ' Дата документа не покрыта или не разрешена.'}
      {content.saved && (
        <span className="mt-1 block text-xs">
          По сохранённым данным
          {content.issues.length ? ' · данные неполные' : ''}
        </span>
      )}
    </>
  );
}
