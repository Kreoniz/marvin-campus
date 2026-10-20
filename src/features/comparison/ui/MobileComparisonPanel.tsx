import { RadioGroup } from 'unlikely-ui/radio-group';
import type { GroupSchedule, Mode } from '../../../lib/types.ts';
import type {
  ComparisonLinks,
  ComparisonView,
} from '../model/use-comparison.ts';
import ComparisonSummary from './ComparisonSummary.tsx';
import ComparisonStatus from './ComparisonStatus.tsx';

interface Props {
  view: ComparisonView;
  schedules: GroupSchedule[];
  links: ComparisonLinks;
  fetching: boolean;
  loading: boolean;
  opening: boolean;
}

export default function MobileComparisonPanel({
  view,
  schedules,
  links,
  fetching,
  loading,
  opening,
}: Props) {
  const comparing = view.groups.length >= 2 || opening;
  return (
    <section
      className={`mobile-comparison border-y border-[var(--u-line-soft)] ${comparing ? 'min-[701px]:grid min-[701px]:grid-cols-[minmax(0,1fr)_270px] min-[701px]:items-center' : ''}`}
      aria-label="Результат и состояние расписания"
    >
      {comparing && (
        <div className="space-y-2 px-3 pt-2 min-[701px]:grid min-[701px]:grid-cols-[220px_minmax(0,1fr)] min-[701px]:items-center min-[701px]:gap-3 min-[701px]:space-y-0 min-[701px]:py-2">
          <RadioGroup.Root
            className="mobile-modes flex [&_.u-segmented-item]:min-h-10 [&_.u-segmented-item]:flex-1 [&_.u-segmented-item]:text-xs"
            variant="segmented"
            aria-label="Режим сравнения"
            value={view.mode}
            disabled={opening}
            onValueChange={(value) => view.selectMode(value as Mode)}
          >
            <RadioGroup.Item value="presence">В вузе</RadioGroup.Item>
            <RadioGroup.Item value="free">Без занятий</RadioGroup.Item>
          </RadioGroup.Root>
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
