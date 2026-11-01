import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { readShare } from '../../../lib/api.ts';
import { track } from '../../../lib/analytics.ts';
import {
  nextSnapshotChangeAt,
  usableSnapshot,
} from '../../../lib/cache-policy.ts';
import { assignColors, type GroupColors } from '../../../lib/colors.ts';
import { addDays, monday, omskToday, validDate } from '../../../lib/dates.ts';
import { compareDay, comparisonIssue } from '../../../lib/domain.ts';
import {
  implicitDateOpening,
  nextInitialDay,
} from '../../../lib/initial-date.ts';
import {
  rememberGroups,
  resolveReadable,
} from '../../../lib/group-directory.ts';
import { selectionWeekOptions } from '../../../lib/schedule-queries.ts';
import {
  isGroup,
  scheduleKey,
  validSelection,
} from '../../../lib/schedule-ref.ts';
import { readSavedScheduleState } from '../../../lib/saved-schedules.ts';
import usePresentationCohort from './use-presentation-cohort.ts';
import { selectionData } from '../../../lib/selection-analytics.ts';
import {
  mergeSubgroups,
  publicSubgroup,
  resolveSubgroupSelection,
  savedSubgroups,
} from '../../../lib/subgroups.ts';
import type {
  Group,
  GroupSchedule,
  Mode,
  Selection,
  Subgroup,
} from '../../../lib/types.ts';
import {
  normalizeView,
  parseView,
  readableGroups,
  shareID,
  viewURL,
  type ViewState,
} from '../../../lib/url.ts';

export type Notify = (
  message: string,
  kind?: 'success' | 'error' | 'info',
) => void;

export interface ComparisonView extends ViewState {
  readonly savedGroups: Selection[];
  cancelInitialDate(): void;
  current(): ViewState;
  apply(value: ViewState): void;
  reorder(groups: Selection[]): void;
  selectDate(value: string): void;
  add(group: Group): void;
  addSchedule(selection: Selection, date?: string): void;
  remove(key: string): void;
  subgroup(key: string, value?: number): void;
  resolveSubgroups(catalog: Record<number, Subgroup[]>): boolean;
  selectWeek(value: string): void;
  selectDay(value: string): void;
  selectMode(value: Mode): void;
  move(key: string, offset: number): void;
  example(): void;
}

export interface ComparisonLinks {
  readonly opening: boolean;
  readonly error: string;
  readonly canRetryOpening: boolean;
  readonly sharing: boolean;
  readonly manual: string;
  retryOpening(): void;
  sync(): void;
  copy(): Promise<void>;
  canonicalize(): void;
  copyManual(): Promise<void>;
}

function retryableOpeningError(error: unknown): boolean {
  // The API currently exposes messages without HTTP status codes. Offer recovery
  // only for known temporary failures, not malformed/ambiguous/missing links.
  return (
    error instanceof TypeError ||
    (error instanceof Error &&
      [
        'Нет сети. Эта группа ещё не сохранена на устройстве.',
        'Слишком много запросов. Подождите несколько секунд.',
        'Очередь обновления занята. Попробуйте через несколько секунд.',
        'Не удалось получить расписание. Попробуйте обновить позже.',
        'Не удалось открыть сравнение. Попробуй позже.',
        'Сервер вернул непонятный ответ. Попробуйте позже.',
      ].includes(error.message))
  );
}

function restoreSelection(value: ViewState, vucOnly: boolean): ViewState {
  let groups: Selection[] = [];
  try {
    groups = JSON.parse(
      localStorage.getItem(
        vucOnly ? 'campus-vuc-selection' : 'campus-groups',
      ) ?? '[]',
    );
    if (vucOnly) groups = groups.filter((ref) => ref?.kind === 'vuc');
  } catch {}
  return normalizeView({ ...value, groups });
}

function initialView(
  url = new URL(
    typeof location === 'undefined' ? 'https://campus.example/' : location.href,
  ),
) {
  const value = parseView(url);
  return url.pathname === '/' &&
    !url.searchParams.has('g') &&
    !url.searchParams.has('s')
    ? restoreSelection(value, false)
    : value;
}

function savedColors(): GroupColors {
  try {
    const saved = JSON.parse(localStorage.getItem('campus-colors') ?? '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved)
      ? Object.fromEntries(
          Object.entries(saved)
            .filter(
              (entry): entry is [string, number] =>
                typeof entry[1] === 'number',
            )
            .map(([key, value]) => [
              /^\d+$/.test(key) ? `rasp:group:${key}` : key,
              value,
            ]),
        )
      : {};
  } catch {
    return {};
  }
}

function useSchedules(selection: Selection[], week: string, enabled: boolean) {
  const [now, setNow] = useState(Date.now);
  const latestSelection = useRef(selection);
  latestSelection.current = selection;
  // Ordering, labels and subgroup changes only reselect the same typed week.
  const idKey = JSON.stringify(
    enabled ? selection.map(scheduleKey).sort() : [],
  );
  const ids = useMemo<string[]>(() => JSON.parse(idKey), [idKey]);
  const queries = useQueries({
    queries: ids.map((key) =>
      selectionWeekOptions(
        selection.find((ref) => scheduleKey(ref) === key)!,
        week,
      ),
    ),
  });
  const [saved, setSaved] = useState<{
    week: string;
    entries: Record<string, Awaited<ReturnType<typeof readSavedScheduleState>>>;
  }>({ week: '', entries: {} });
  const cacheRevision = JSON.stringify(
    queries.map((query) => [
      query.dataUpdatedAt,
      query.errorUpdatedAt,
      query.fetchStatus,
    ]),
  );
  useEffect(() => {
    let cancelled = false;
    void Promise.all(
      ids.map(async (key) => {
        const ref = latestSelection.current.find(
          (ref) => scheduleKey(ref) === key,
        )!;
        return [key, await readSavedScheduleState(ref, week)] as const;
      }),
    ).then((entries) => {
      if (!cancelled) setSaved({ week, entries: Object.fromEntries(entries) });
    });
    return () => {
      cancelled = true;
    };
  }, [ids, week, now, cacheRevision]);
  const availableSchedules: GroupSchedule[] = selection.map((ref) => {
    const key = scheduleKey(ref),
      query = queries[ids.indexOf(key)];
    const data =
      query?.data ??
      (saved.week === week ? saved.entries[key]?.snapshot : undefined);
    const snapshot = usableSnapshot(
      data,
      week,
      Math.max(now, Date.now(), query?.dataUpdatedAt ?? 0),
    );
    const paused = query?.fetchStatus === 'paused';
    return {
      selection: ref,
      snapshot,
      offline: saved.week === week ? saved.entries[key]?.offline : undefined,
      error:
        query?.error?.message ||
        (paused && !snapshot
          ? 'Нет сети. Это расписание ещё не сохранено на устройстве.'
          : data && !snapshot
            ? 'Сохранённый снимок слишком старый. Нужны данные источника.'
            : undefined),
      loading: !snapshot && !!query?.isPending && !paused,
      fetching: query?.isFetching ?? false,
    };
  });
  const changeAt = nextSnapshotChangeAt(
    ids.flatMap((key, index) => [
      queries[index]?.data,
      saved.week === week ? saved.entries[key]?.snapshot : undefined,
    ]),
    week,
    now,
  );
  useEffect(() => {
    if (changeAt === undefined) return;
    const timer = window.setTimeout(
      () => setNow(Date.now()),
      Math.max(1, changeAt - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [changeAt, now]);
  useEffect(() => {
    const updateClock = () => setNow(Date.now());
    window.addEventListener('focus', updateClock);
    window.addEventListener('online', updateClock);
    window.addEventListener('campus-public-cache-change', updateClock);
    return () => {
      window.removeEventListener('focus', updateClock);
      window.removeEventListener('online', updateClock);
      window.removeEventListener('campus-public-cache-change', updateClock);
    };
  }, []);
  const schedules = usePresentationCohort(
    availableSchedules,
    week,
    enabled,
  ).map((entry) => ({
    ...entry,
    // Storage truth is current state, independent of calendar publication delay.
    offline: availableSchedules.find(
      (row) => scheduleKey(row.selection) === scheduleKey(entry.selection),
    )?.offline,
  }));
  return {
    schedules,
    pending: schedules.some((row) => row.loading),
    fetching: queries.some((query) => query.isFetching),
    revision: queries.map((query) => [
      query.dataUpdatedAt,
      query.errorUpdatedAt,
    ]),
  };
}

function rememberSelection(selection: Selection[], vucOnly: boolean) {
  if (!vucOnly) rememberGroups(selection);
  try {
    localStorage.setItem(
      vucOnly ? 'campus-vuc-selection' : 'campus-groups',
      JSON.stringify(selection),
    );
  } catch {}
}

export function useComparison(notify: Notify, vucOnly = false) {
  const client = useQueryClient();
  const [state, setState] = useState(initialView);
  const stateRef = useRef(state);
  const [openedAt] = useState(() =>
    typeof location === 'undefined'
      ? undefined
      : implicitDateOpening(new URL(location.href), new Date()),
  );
  const initialDate = useRef(openedAt);
  const canonicalizeRef = useRef<() => void>(() => {});
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  const changedRef = useRef<() => void>(() => {});
  const [subgroupCatalog, setSubgroupCatalog] = useState(savedSubgroups);
  const catalogRef = useRef(subgroupCatalog);
  catalogRef.current = subgroupCatalog;
  const reportKey = useRef('');
  const reportedLoads = useRef(new Set<string>());
  const reportedSelections = useRef(new Map<string, string>());
  const [colors, setColors] = useState(() =>
    assignColors(state.groups.map(scheduleKey), savedColors()),
  );

  // Stable methods read synchronously updated refs. A date/subgroup change and
  // its URL are one operation even before React commits the next render.
  const view = useMemo<ComparisonView>(() => {
    function cancelInitialDate() {
      if (initialDate.current === undefined) return;
      initialDate.current = undefined;
      // Establish the original entry before an intentional change pushes one.
      canonicalizeRef.current();
    }
    function apply(value: ViewState) {
      stateRef.current = value;
      setState(value);
    }
    function change(value: Partial<ViewState>) {
      cancelInitialDate();
      const current = stateRef.current;
      const next = { ...current, ...value };
      const sameGroups =
        next.groups.length === current.groups.length &&
        next.groups.every((group, index) => {
          const previous = current.groups[index];
          return (
            scheduleKey(group) === scheduleKey(previous) &&
            group.subgroup === previous.subgroup &&
            group.subgroupNumber === previous.subgroupNumber
          );
        });
      if (
        sameGroups &&
        next.week === current.week &&
        next.day === current.day &&
        next.mode === current.mode
      )
        return false;
      apply(next);
      // Explicit links are temporary views. Only an intentional selection edit
      // adopts their set as the saved workspace; dates and copying do not.
      if (value.groups && !sameGroups) rememberSelection(next.groups, vucOnly);
      changedRef.current();
      return true;
    }
    function reorder(groups: Selection[]) {
      if (!change({ groups })) return;
      if (groups.some(isGroup))
        track('groups_reordered', {
          group_count: groups.filter(isGroup).length,
        });
    }
    function addSchedule(selection: Selection, requestedDate?: string) {
      const groups = stateRef.current.groups;
      if (
        !validSelection(selection) ||
        (vucOnly && selection.kind !== 'vuc') ||
        groups.length >= 30 ||
        groups.some(
          (existing) => scheduleKey(existing) === scheduleKey(selection),
        )
      )
        return;
      const date =
        requestedDate && validDate(requestedDate) ? requestedDate : undefined;
      change({
        groups: [...groups, { ...selection }],
        ...(date ? { week: monday(date), day: date } : {}),
      });
      notifyRef.current(`${selection.label}: расписание добавлено.`);
      if (isGroup(selection))
        track('group_added', {
          ...selectionData(selection),
          group_count: groups.filter(isGroup).length + 1,
        });
    }
    return {
      cancelInitialDate,
      get groups() {
        return stateRef.current.groups;
      },
      get savedGroups() {
        return restoreSelection(stateRef.current, vucOnly).groups;
      },
      get week() {
        return stateRef.current.week;
      },
      get day() {
        return stateRef.current.day;
      },
      get mode() {
        return stateRef.current.mode;
      },
      current() {
        return {
          ...stateRef.current,
          groups: stateRef.current.groups.map((group) => ({ ...group })),
        };
      },
      apply,
      reorder,
      selectDate(value) {
        if (!validDate(value)) return;
        if (!change({ week: monday(value), day: value })) return;
        track('date_selected');
      },
      add: addSchedule,
      addSchedule,
      remove(key) {
        const groups = stateRef.current.groups,
          removed = groups.find((group) => scheduleKey(group) === key);
        if (!removed) return;
        change({
          groups: groups.filter((group) => scheduleKey(group) !== key),
        });
        notifyRef.current(`${removed.label}: расписание убрано.`);
        if (isGroup(removed))
          track('group_removed', {
            ...selectionData(removed),
            group_count: groups.filter(isGroup).length - 1,
          });
      },
      subgroup(key, value) {
        const selected = stateRef.current.groups.find(
          (group) => scheduleKey(group) === key,
        );
        if (!selected || !isGroup(selected)) return;
        const number =
          publicSubgroup(
            catalogRef.current[selected.id]?.find(
              (subgroup) => subgroup.id === value,
            )?.label ?? '',
          ) ??
          (value !== undefined && selected.subgroup === value
            ? selected.subgroupNumber
            : undefined);
        if (
          !change({
            groups: stateRef.current.groups.map((group) =>
              scheduleKey(group) === key && isGroup(group)
                ? { ...group, subgroup: value, subgroupNumber: number }
                : group,
            ),
          })
        )
          return;
        const group = stateRef.current.groups.find(
          (group) => scheduleKey(group) === key,
        );
        if (group && isGroup(group))
          track('subgroup_changed', selectionData(group));
      },
      resolveSubgroups(known) {
        let updated = false;
        const groups = stateRef.current.groups.map((group) => {
          const resolved = resolveSubgroupSelection(
            group,
            isGroup(group) ? (known[group.id] ?? []) : [],
          );
          if (resolved !== group) updated = true;
          return resolved;
        });
        if (updated) apply({ ...stateRef.current, groups });
        return updated;
      },
      selectWeek(value) {
        if (!validDate(value)) return;
        const current = stateRef.current;
        const offset = Math.round(
          (Date.parse(current.day) - Date.parse(current.week)) / 86400000,
        );
        const week = monday(value);
        if (!change({ week, day: addDays(week, offset) })) return;
        const currentWeek = monday(omskToday());
        track('week_changed', {
          week_relation:
            week < currentWeek
              ? 'past'
              : week > currentWeek
                ? 'future'
                : 'current',
        });
      },
      selectDay(value) {
        if (!validDate(value) || monday(value) !== stateRef.current.week)
          return;
        if (!change({ day: value })) return;
        track('day_changed');
      },
      selectMode(mode) {
        if (!change({ mode })) return;
        track('mode_changed', { mode });
      },
      move(key, offset) {
        const groups = stateRef.current.groups;
        const index = groups.findIndex((group) => scheduleKey(group) === key),
          target = index + offset;
        if (index < 0 || target < 0 || target >= groups.length) return;
        const next = groups.slice();
        [next[index], next[target]] = [next[target], next[index]];
        reorder(next);
      },
      example() {
        change({
          groups: [
            { id: 373, label: 'ИВТ-241' },
            { id: 374, label: 'ИВТ-242' },
          ],
        });
      },
    };
  }, [vucOnly]);

  const [linkState, setLinkState] = useState(() => ({
    opening: typeof location !== 'undefined' && location.pathname !== '/',
    error: '',
    sharing: false,
    manual: '',
  }));
  const linkRef = useRef(linkState);
  const readController = useRef<AbortController | undefined>(undefined);
  const retryOpeningRef = useRef<(() => void) | undefined>(undefined);
  const links = useMemo<ComparisonLinks>(() => {
    function update(next: Partial<typeof linkState>) {
      linkRef.current = { ...linkRef.current, ...next };
      setLinkState(linkRef.current);
    }
    function canonicalize() {
      if (
        initialDate.current !== undefined ||
        linkRef.current.opening ||
        linkRef.current.error
      )
        return;
      const value = view.current();
      if (!vucOnly) rememberGroups(value.groups);
      history.replaceState(
        { campusView: value },
        '',
        viewURL(value, new URL(location.href)),
      );
    }
    return {
      get opening() {
        return linkRef.current.opening;
      },
      get error() {
        return linkRef.current.error;
      },
      get canRetryOpening() {
        return !!retryOpeningRef.current && !linkRef.current.opening;
      },
      get sharing() {
        return linkRef.current.sharing;
      },
      get manual() {
        return linkRef.current.manual;
      },
      retryOpening() {
        if (!linkRef.current.opening) retryOpeningRef.current?.();
      },
      canonicalize,
      sync() {
        update({ manual: '' });
        const value = view.current();
        if (!vucOnly) rememberGroups(value.groups);
        history.pushState(
          { campusView: value },
          '',
          viewURL(value, new URL(location.href)),
        );
      },
      async copy() {
        if (linkRef.current.sharing) return;
        view.cancelInitialDate();
        update({ sharing: true, manual: '' });
        const value = view.current(),
          url = viewURL(
            value,
            new URL(location.pathname, location.origin),
          ).href;
        canonicalize();
        try {
          // No await before writeText: preserve Safari's clipboard activation.
          await navigator.clipboard.writeText(url);
          notifyRef.current('Ссылка скопирована. Можно отправлять другу.');
          track('share_link_copied', {
            link_format: 'readable',
            group_count: value.groups.filter(isGroup).length,
            mode: value.mode,
          });
        } catch {
          update({ manual: url });
          notifyRef.current('Выдели и скопируй ссылку ниже.', 'info');
        } finally {
          update({ sharing: false });
        }
      },
      async copyManual() {
        try {
          await navigator.clipboard.writeText(linkRef.current.manual);
          const value = view.current();
          track('share_link_copied', {
            link_format: 'readable',
            group_count: value.groups.filter(isGroup).length,
            mode: value.mode,
          });
          notifyRef.current('Ссылка скопирована.');
          update({ manual: '' });
        } catch {
          notifyRef.current('Выдели ссылку и скопируй её вручную.', 'info');
        }
      },
    };
  }, [view, vucOnly]);
  changedRef.current = links.sync;
  canonicalizeRef.current = links.canonicalize;

  useEffect(() => {
    function update(next: Partial<typeof linkState>) {
      linkRef.current = { ...linkRef.current, ...next };
      setLinkState(linkRef.current);
    }
    async function openLocation(url: URL) {
      readController.current?.abort();
      retryOpeningRef.current = undefined;
      const controller = new AbortController();
      readController.current = controller;
      const signal = controller.signal,
        id = shareID(url);
      update({ error: '', manual: '', opening: true });
      try {
        if (!id && url.pathname.startsWith('/s/'))
          throw new Error('Ссылка на сравнение не найдена.');
        const readable = readableGroups(url);
        let value = id
          ? normalizeView(await readShare(id, signal))
          : readable !== undefined
            ? await resolveReadable(url, client, signal)
            : initialView(url);
        if (signal.aborted) return;
        if (vucOnly && !url.searchParams.has('s')) {
          value = restoreSelection(value, true);
        }
        if (
          (url.pathname === '/compare' ||
            (url.pathname === '/vuc' && url.searchParams.has('s'))) &&
          !value.groups.length
        )
          throw new Error('Некорректная ссылка на сравнение.');
        view.apply(value);
        if (id || readable !== undefined) {
          reportKey.current = '';
          reportedSelections.current = new Map();
          track('share_opened', {
            link_format: id ? 'legacy' : 'readable',
            group_count: value.groups.filter(isGroup).length,
            mode: value.mode,
          });
        }
        update({ opening: false });
        links.canonicalize();
      } catch (error) {
        if (!signal.aborted) {
          // Keep the exact failed URL; retries use the same resolver/query cache.
          if (retryableOpeningError(error))
            retryOpeningRef.current = () => void openLocation(url);
          update({
            error:
              error instanceof Error
                ? error.message
                : 'Не удалось открыть сравнение.',
          });
        }
      } finally {
        if (!signal.aborted) update({ opening: false });
      }
    }
    const url = new URL(location.href);
    if (url.pathname !== '/') void openLocation(url);
    else {
      if (view.groups.length) links.canonicalize();
      else
        history.replaceState({ campusView: view.current() }, '', location.href);
    }
    function onBack(event: PopStateEvent) {
      // History is explicit navigation, including entries without campusView.
      initialDate.current = undefined;
      if (
        !event.state?.campusView ||
        (vucOnly &&
          event.state.campusView.groups?.some(
            (ref: Selection) => ref?.kind !== 'vuc',
          ))
      ) {
        void openLocation(new URL(location.href));
        return;
      }
      readController.current?.abort();
      retryOpeningRef.current = undefined;
      update({ opening: false, error: '', manual: '' });
      view.apply(normalizeView(event.state.campusView));
      links.canonicalize();
    }
    window.addEventListener('popstate', onBack);
    return () => {
      readController.current?.abort();
      retryOpeningRef.current = undefined;
      window.removeEventListener('popstate', onBack);
    };
  }, [client, links, view, vucOnly]);

  const source = useSchedules(
    state.groups,
    state.week,
    !linkState.opening && !linkState.error,
  );
  const busy = linkState.opening || source.pending;
  const fetching = linkState.opening || source.fetching;

  useEffect(() => {
    const current: Record<number, Subgroup[]> = {};
    for (const row of source.schedules) {
      if (isGroup(row.selection) && row.snapshot)
        current[row.selection.id] = row.snapshot.data.subgroups ?? [];
    }
    if (view.resolveSubgroups(current)) links.canonicalize();
  }, [state.groups, source.schedules, view, links]);

  useEffect(() => {
    if (
      initialDate.current === undefined ||
      linkState.opening ||
      linkState.error ||
      stateRef.current !== state ||
      source.fetching ||
      source.pending
    )
      return;
    // Decide once, at initial settlement. Later refreshes and clock/deadline
    // ticks cannot take an active page away from its selected day.
    const next = nextInitialDay(
      source.schedules,
      initialDate.current,
      Date.now(),
    );
    initialDate.current = undefined;
    if (next) view.apply({ ...view.current(), week: monday(next), day: next });
    if (view.groups.length) links.canonicalize();
  }, [linkState.opening, linkState.error, state, source, view, links]);

  const colorKey = JSON.stringify(state.groups.map(scheduleKey));
  useEffect(() => {
    if (!colorKey) return;
    const ids: string[] = JSON.parse(colorKey);
    setColors((previous) => {
      const next = assignColors(ids, previous);
      return JSON.stringify(previous) === JSON.stringify(next)
        ? previous
        : next;
    });
  }, [colorKey]);
  useEffect(() => {
    if (!Object.keys(colors).length) return;
    try {
      localStorage.setItem('campus-colors', JSON.stringify(colors));
    } catch {}
  }, [colors]);

  useEffect(() => {
    const snapshots = source.schedules.filter(
      (group) => group.snapshot && isGroup(group.selection),
    );
    if (!snapshots.length) return;
    setSubgroupCatalog((previous) => {
      const next = { ...previous };
      for (const group of snapshots) {
        if (!isGroup(group.selection)) continue;
        next[group.selection.id] = mergeSubgroups(
          next[group.selection.id] ?? [],
          group.snapshot!.data.subgroups ?? [],
        );
      }
      if (JSON.stringify(next) === JSON.stringify(previous)) return previous;
      return next;
    });
  }, [source.schedules]);
  useEffect(() => {
    if (!Object.keys(subgroupCatalog).length) return;
    try {
      localStorage.setItem('campus-subgroups', JSON.stringify(subgroupCatalog));
    } catch {}
  }, [subgroupCatalog]);

  useEffect(() => {
    if (fetching || !state.groups.some(isGroup)) return;
    const revision = JSON.stringify([
      state.week,
      state.groups.map(scheduleKey).sort(),
      source.revision,
    ]);
    if (reportedLoads.current.has(revision)) return;
    reportedLoads.current.add(revision);
    const currentWeek = monday(omskToday());
    track('schedule_loaded', {
      group_count: state.groups.filter(isGroup).length,
      success: source.schedules.every((group) => !comparisonIssue(group)),
      stale: source.schedules.some((group) => !!group.snapshot?.stale),
      week_relation:
        state.week < currentWeek
          ? 'past'
          : state.week > currentWeek
            ? 'future'
            : 'current',
    });
  }, [fetching, state.groups, state.week, source.revision, source.schedules]);

  useEffect(() => {
    const signature = JSON.stringify([
      state.groups
        .slice()
        .sort((a, b) => scheduleKey(a).localeCompare(scheduleKey(b)))
        .map((group) => [
          scheduleKey(group),
          group.subgroupNumber ? `s${group.subgroupNumber}` : group.subgroup,
        ]),
      state.week,
      state.mode,
    ]);
    if (
      state.groups.filter(isGroup).length < 2 ||
      busy ||
      source.schedules.some((group) => comparisonIssue(group)) ||
      signature === reportKey.current
    )
      return;
    reportKey.current = signature;
    const results = Array.from({ length: 7 }, (_, index) =>
      compareDay(source.schedules, addDays(state.week, index)),
    );
    track('comparison_used', {
      group_count: state.groups.filter(isGroup).length,
      mode: state.mode,
      has_overlap: results.some((result) =>
        state.mode === 'presence'
          ? result.presence.length > 0
          : result.free.length > 0,
      ),
      stale: source.schedules.some((group) => !!group.snapshot?.stale),
    });
  }, [busy, state, source.schedules]);

  useEffect(() => {
    if (busy) return;
    const next = new Map<string, string>();
    for (const group of source.schedules) {
      if (!group.snapshot || !isGroup(group.selection)) continue;
      const signature = JSON.stringify([
        scheduleKey(group.selection),
        group.selection.subgroupNumber
          ? `s${group.selection.subgroupNumber}`
          : group.selection.subgroup,
      ]);
      next.set(scheduleKey(group.selection), signature);
      if (
        reportedSelections.current.get(scheduleKey(group.selection)) !==
        signature
      )
        track('group_selected', selectionData(group.selection));
    }
    reportedSelections.current = next;
  }, [busy, source.schedules]);

  return { view, links, source, colors, subgroupCatalog };
}
