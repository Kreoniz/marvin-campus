import { queryOptions } from '@tanstack/react-query';
import { loadWeek } from './api.ts';
import {
  CACHE_RETENTION,
  scheduleKey as groupQueryKey,
  snapshotStaleTime,
} from './cache-policy.ts';
import { isGroup } from './schedule-ref.ts';
import { loadResourceWeek, loadVucWeek } from '../features/resources/api.ts';
import type { ScheduleData, Selection, Snapshot } from './types.ts';

export function selectionWeekOptions(selection: Selection, week: string) {
  const queryKey = isGroup(selection)
    ? groupQueryKey(selection.id, week)
    : selection.kind === 'vuc'
      ? (['vuc-week', selection.id, week] as const)
      : (['resource-week', selection.kind, selection.id, week] as const);
  return queryOptions({
    queryKey,
    queryFn: ({ signal }): Promise<Snapshot<ScheduleData>> =>
      isGroup(selection)
        ? loadWeek(selection.id, week, signal)
        : selection.kind === 'vuc'
          ? loadVucWeek(selection, week, signal)
          : loadResourceWeek(selection, week, signal),
    staleTime: (query) =>
      snapshotStaleTime(query.state.data, week, query.state.dataUpdatedAt),
    gcTime: CACHE_RETENTION,
    retry: false,
    networkMode: isGroup(selection) ? 'offlineFirst' : 'always',
  });
}
