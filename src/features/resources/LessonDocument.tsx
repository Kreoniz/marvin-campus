import type { Lesson, VucRef } from '../../lib/types.ts';
import { timeLabel } from '../../lib/dates.ts';
import VucOriginalLink from './VucOriginalLink.tsx';

export default function LessonDocument({
  lesson,
  documentRef,
}: {
  lesson: Lesson;
  documentRef?: VucRef;
}) {
  if (!lesson.rawText && !lesson.sourceOrigin && !documentRef) return null;
  return (
    <details className="mt-2 text-xs leading-relaxed text-u-muted">
      <summary className="min-h-6 cursor-pointer rounded-sm focus-visible:outline-2 focus-visible:outline-u-ink">
        Строка документа
      </summary>
      {lesson.rawText && (
        <p className="my-1 whitespace-pre-wrap">{lesson.rawText}</p>
      )}
      {lesson.sourceOrigin && <p className="my-1">{lesson.sourceOrigin}</p>}
      {!!lesson.sourceIntervals && lesson.sourceIntervals.length > 1 && (
        <p className="my-1">
          Интервалы в документе:{' '}
          {lesson.sourceIntervals
            .map((range) => `${timeLabel(range.start)}–${timeLabel(range.end)}`)
            .join(', ')}
          .
        </p>
      )}
      <VucOriginalLink ref={documentRef} />
    </details>
  );
}
