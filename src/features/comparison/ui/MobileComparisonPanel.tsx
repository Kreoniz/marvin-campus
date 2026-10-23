import { RadioGroup } from 'unlikely-ui/radio-group';
import { comparisonScope } from '../../../lib/domain.ts';
import { selectionLabel } from '../../../lib/subgroups.ts';
import type { GroupSchedule, Mode } from '../../../lib/types.ts';
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
  links: ComparisonLinks;
  fetching: boolean;
  loading: boolean;
  opening: boolean;
}

export default function MobileComparisonPanel({
  section,
  view,
  schedules,
  links,
  fetching,
  loading,
  opening,
}: Props) {
  const comparing = view.groups.length >= 2 || opening;
  const { included, excluded } = comparisonScope(schedules);
  if (section === 'controls') {
    return (
      <div className="mobile-comparison-controls">
        {comparing && (
          <RadioGroup.Root
            className="mobile-modes mx-3 my-2 flex [&_.u-segmented-item]:min-h-10 [&_.u-segmented-item]:flex-1 [&_.u-segmented-item]:text-xs"
            variant="segmented"
            aria-label="Режим сравнения"
            value={view.mode}
            disabled={opening}
            onValueChange={(value) => view.selectMode(value as Mode)}
          >
            <RadioGroup.Item value="presence">В вузе</RadioGroup.Item>
            <RadioGroup.Item value="free">Без занятий</RadioGroup.Item>
          </RadioGroup.Root>
        )}
        {!opening && excluded.length > 0 && (
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
            day={view.day}
            mode={view.mode}
            loading={loading}
            placeholder={opening}
            compact
            showHeading={false}
          />
        </div>
      )}
      <ComparisonStatus
        schedules={schedules}
        fetching={fetching}
        links={links}
      />
    </section>
  );
}
