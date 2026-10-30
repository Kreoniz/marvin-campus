import { comparisonScope } from '../../../lib/domain.ts';
import { participates } from '../../../lib/schedule-ref.ts';
import { selectionLabel } from '../../../lib/subgroups.ts';
import type { GroupSchedule, ScheduleKind } from '../../../lib/types.ts';
import type {
  ComparisonLinks,
  ComparisonView,
} from '../model/use-comparison.ts';
import ComparisonSummary from './ComparisonSummary.tsx';
import ComparisonStatus from './ComparisonStatus.tsx';

interface Props {
  section: 'controls' | 'result';
  view: ComparisonView;
  schedules: GroupSchedule[];
  hiddenKinds?: ScheduleKind[];
  links: ComparisonLinks;
  fetching: boolean;
  loading: boolean;
  opening: boolean;
}

export default function MobileComparisonPanel({
  section,
  view,
  schedules,
  hiddenKinds = [],
  links,
  fetching,
  loading,
  opening,
}: Props) {
  const comparing = view.groups.filter(participates).length >= 2 || opening;
  const { included, excluded } = comparisonScope(schedules, view.day);
  if (section === 'controls') {
    return (
      <div className="mobile-comparison-controls">
        {!opening &&
          (!loading || schedules.some((schedule) => schedule.snapshot)) &&
          excluded.length > 0 && (
            <p
              className="m-0 border-t border-(--u-line-soft) px-3 py-2 text-xs leading-snug"
              role="status"
            >
              {included.length >= 2
                ? 'Частичное сравнение. '
                : 'Совместный результат недоступен. '}
              {included.length > 0 &&
                `Учтены: ${included.map((group) => selectionLabel(group.selection)).join(' + ')}. `}
              Не учтены:{' '}
              {excluded
                .map((group) => selectionLabel(group.selection))
                .join(', ')}
              .
            </p>
          )}
      </div>
    );
  }
  return (
    <section
      className="mobile-comparison border-t border-(--u-line-soft)"
      aria-label="Результат и состояние расписания"
    >
      {comparing && (
        <div className="px-3 pt-2">
          <ComparisonSummary
            schedules={schedules}
            hiddenKinds={hiddenKinds}
            day={view.day}
            mode={view.mode}
            loading={loading}
            placeholder={opening}
            compact
          />
        </div>
      )}
      <ComparisonStatus
        schedules={schedules}
        day={view.day}
        fetching={fetching}
        links={links}
      />
    </section>
  );
}
