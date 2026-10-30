import type { Lesson, ResourceRef } from '../../lib/types.ts';
import { useResourceInspector } from './ResourceInspector.tsx';

type Open = (
  resource: ResourceRef,
  trigger: HTMLButtonElement,
  date: string,
) => void;
const linkClass =
  'inline-flex min-h-6 cursor-pointer items-center rounded-sm border-0 bg-transparent p-0 text-inherit underline decoration-u-muted underline-offset-2 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-u-ink';

export function LessonRoom({
  lesson,
  onOpen,
}: {
  lesson: Lesson;
  onOpen?: Open;
}) {
  const { openResource } = useResourceInspector();
  const label = lesson.remote
    ? 'Онлайн'
    : lesson.room.trim() || 'Аудитория не указана';
  const ref = lesson.roomRef;
  return !lesson.remote && ref ? (
    <button
      type="button"
      className={linkClass}
      aria-label={`Открыть расписание аудитории ${ref.label}`}
      onClick={(event) =>
        (onOpen ?? openResource)(ref, event.currentTarget, lesson.date)
      }
    >
      {label}
    </button>
  ) : (
    <>{label}</>
  );
}

export function LessonTeachers({
  lesson,
  onOpen,
}: {
  lesson: Lesson;
  onOpen?: Open;
}) {
  const { openResource } = useResourceInspector();
  const teachers = lesson.teachers ?? [];
  if (!teachers.length) return <>{lesson.teacher}</>;
  return teachers.map((ref, index) => (
    <span key={`${ref.kind}:${ref.id}`}>
      {index > 0 && ', '}
      <button
        type="button"
        className={linkClass}
        aria-label={`Открыть расписание преподавателя ${ref.label}`}
        onClick={(event) =>
          (onOpen ?? openResource)(ref, event.currentTarget, lesson.date)
        }
      >
        {teachers.length === 1 ? lesson.teacher || ref.label : ref.label}
      </button>
    </span>
  ));
}
