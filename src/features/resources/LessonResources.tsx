import { useState } from 'react';
import type { Lesson, ResourceRef } from '../../lib/types.ts';
import { useResourceInspector } from './ResourceInspector.tsx';
import type { AgendaEntry } from '../../lib/agenda.ts';
import {
  kindLabel,
  scheduleKey,
  selectionKind,
} from '../../lib/schedule-ref.ts';

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
      aria-label={`Добавить расписание аудитории ${ref.label}`}
      title="Добавить в календарь"
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
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? teachers : teachers.slice(0, 3);
  if (!teachers.length) return <>{lesson.teacher}</>;
  return (
    <>
      {shown.map((ref, index) => (
        <span key={`${ref.kind}:${ref.id}`}>
          {index > 0 && ', '}
          <button
            type="button"
            className={linkClass}
            aria-label={`Добавить расписание преподавателя ${ref.label}`}
            title="Добавить в календарь"
            onClick={(event) =>
              (onOpen ?? openResource)(ref, event.currentTarget, lesson.date)
            }
          >
            {ref.label}
          </button>
        </span>
      ))}
      {teachers.length > 3 && (
        <button
          type="button"
          className={`${linkClass} ml-1`}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          aria-label={
            expanded
              ? 'Свернуть список преподавателей'
              : `Показать ещё ${teachers.length - 3} преподавателей`
          }
        >
          {expanded ? 'Свернуть' : `+${teachers.length - 3}`}
        </button>
      )}
    </>
  );
}

// Conflicting raw labels remain inspectable without assigning them an identity.
export function LessonTeacherSources({ entry }: { entry: AgendaEntry }) {
  const sources = entry.members.flatMap((member) =>
    (entry.memberLessons[scheduleKey(member)] ?? []).flatMap((lesson) =>
      lesson.teacher.trim()
        ? [
            {
              label: `${kindLabel(selectionKind(member))}: ${member.label}`,
              text: lesson.teacher.trim(),
            },
          ]
        : [],
    ),
  );
  if (new Set(sources.map((source) => source.text)).size < 2) return null;
  return (
    <div className="teacher-sources my-2 text-xs leading-relaxed">
      <strong>Преподаватели в исходных расписаниях</strong>
      {sources.map((source, index) => (
        <p className="my-1" key={`${source.label}:${index}`}>
          <span className="text-u-muted">{source.label}: </span>
          {source.text}
        </p>
      ))}
    </div>
  );
}
