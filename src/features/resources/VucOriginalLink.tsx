import { validSelection } from '../../lib/schedule-ref.ts';
import type { VucRef } from '../../lib/types.ts';

export default function VucOriginalLink({
  ref,
  available,
}: {
  ref: VucRef | undefined;
  available?: boolean;
}) {
  if (!ref) return null;
  if (
    !validSelection(ref) ||
    !/^d[0-9a-f]{12}-p[0-9]{3}[a-z]?$/.test(ref.id) ||
    (available ?? ref.originalAvailable) !== true
  )
    return (
      <span className="inline-flex min-h-8 items-center text-xs text-u-muted">
        Оригинал недоступен
      </span>
    );
  return (
    <a
      className="inline-flex min-h-8 items-center rounded-sm text-xs underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-u-ink"
      href={`/api/vuc/${encodeURIComponent(ref.id)}/original`}
      download
    >
      Скачать оригинал
    </a>
  );
}
