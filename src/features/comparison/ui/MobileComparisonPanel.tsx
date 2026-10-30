import { comparisonScope } from '../../../lib/domain.ts';
import { selectionLabel } from '../../../lib/subgroups.ts';
import type { GroupSchedule } from '../../../lib/types.ts';
import type { ComparisonView } from '../model/use-comparison.ts';

export default function MobileComparisonPanel({
  view,
  schedules,
  loading,
  opening,
}: {
  view: ComparisonView;
  schedules: GroupSchedule[];
  loading: boolean;
  opening: boolean;
}) {
  const { included, excluded } = comparisonScope(schedules, view.day);
  if (
    opening ||
    (loading && !schedules.some((schedule) => schedule.snapshot)) ||
    !excluded.length
  )
    return null;
  return (
    <p
      className="mobile-comparison-controls m-0 border-t border-u-line-soft px-3 py-2 text-xs leading-snug"
      role="status"
    >
      {included.length >= 2
        ? `Частичное сравнение · ${included.length} из ${included.length + excluded.length}. `
        : `Совместный результат недоступен · учтены ${included.length} из ${included.length + excluded.length}. `}
      Не учтены:{' '}
      {excluded.map((group) => selectionLabel(group.selection)).join(', ')}.
    </p>
  );
}
