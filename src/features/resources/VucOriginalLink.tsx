import type { VucRef } from '../../lib/types.ts';
import { vucOriginalAvailable } from '../../lib/vuc-documents.ts';
import useVucCatalogue from './use-vuc-catalogue.ts';

export default function VucOriginalLink({ ref }: { ref: VucRef | undefined }) {
  const { entries, query } = useVucCatalogue(!!ref);
  if (!ref) return null;
  if (query.isError || !vucOriginalAvailable(ref, entries))
    return (
      <span className="inline-flex min-h-8 items-center text-xs text-u-muted">
        Оригинал недоступен
      </span>
    );
  return (
    <a
      className="inline-flex min-h-8 items-center rounded-sm text-xs underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-u-ink"
      href={`/api/vuc/${encodeURIComponent(ref.id)}/original`}
      aria-label={`Скачать документ ${ref.label}`}
      download
    >
      Скачать
    </a>
  );
}
