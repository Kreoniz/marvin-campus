import type { GroupSchedule } from '../../lib/types.ts';
import { vucSourceDocuments } from '../../lib/vuc-documents.ts';
import useVucCatalogue from './use-vuc-catalogue.ts';
import VucOriginalLink from './VucOriginalLink.tsx';

export default function VucSources({
  schedules,
}: {
  schedules: GroupSchedule[];
}) {
  const hasSources = schedules.some((row) => row.selection.kind === 'vuc');
  const { entries } = useVucCatalogue(hasSources);
  const documents = vucSourceDocuments(schedules, entries);
  if (!documents.length) return null;
  return (
    <section
      className="vuc-sources flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 text-xs"
      aria-label="Источники ВУЦ"
    >
      {documents.map((ref) => (
        <VucOriginalLink key={ref.id} ref={ref} />
      ))}
    </section>
  );
}
