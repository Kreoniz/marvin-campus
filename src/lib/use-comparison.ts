import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { readShare } from './api.ts';
import { track } from './analytics.ts';
import { snapshotChangeAt, usableSnapshot } from './cache-policy.ts';
import { assignColors, type GroupColors } from './colors.ts';
import { addDays, monday, omskToday, validDate } from './dates.ts';
import { compareDay } from './domain.ts';
import { rememberGroups, resolveReadable } from './group-directory.ts';
import { scheduleOptions } from './queries.ts';
import { readSavedSchedule } from './saved-schedules.ts';
import { selectionData } from './selection-analytics.ts';
import { mergeSubgroups, publicSubgroup, savedSubgroups } from './subgroups.ts';
import type {
  Group,
  GroupSchedule,
  Mode,
  Selection,
  Snapshot,
  Subgroup,
  Week,
} from './types.ts';
import {
  normalizeView,
  parseView,
  readableGroups,
  shareID,
  viewURL,
  type ViewState,
} from './url.ts';

export type Notify = (
  message: string,
  kind?: 'success' | 'error' | 'info',
) => void;

export interface ComparisonView extends ViewState {
  current(): ViewState;
  apply(value: ViewState): void;
  reorder(groups: Selection[]): void;
  selectDate(value: string): void;
  add(group: Group): void;
  remove(id: number): void;
  subgroup(id: number, value?: number): void;
  resolveSubgroups(catalog: Record<number, Subgroup[]>): boolean;
  selectWeek(value: string): void;
  selectDay(value: string): void;
  selectMode(value: Mode): void;
  move(id: number, offset: number): void;
  example(): void;
}

export interface ComparisonLinks {
  readonly opening: boolean;
  readonly error: string;
  readonly sharing: boolean;
  readonly manual: string;
  sync(): void;
  copy(): Promise<void>;
  canonicalize(): void;
  copyManual(): Promise<void>;
}

function initialView() {
  return parseView(
    new URL(
      typeof location === 'undefined'
        ? 'https://campus.example/'
        : location.href,
    ),
  );
}

function savedColors(): GroupColors {
  try {
    const saved = JSON.parse(localStorage.getItem('campus-colors') ?? '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved)
      ? saved
      : {};
  } catch {
    return {};
  }
}

function useSchedules(selection: Selection[], week: string, enabled: boolean) {
  const client = useQueryClient();
  const [now, setNow] = useState(Date.now);
  // Subgroup and visual ordering only reselect an existing full-week response.
  const idKey = enabled
    ? selection
        .map((group) => group.id)
        .sort((a, b) => a - b)
        .join(',')
    : '';
  const ids = useMemo(
    () => (idKey ? idKey.split(',').map(Number) : []),
    [idKey],
  );
  const queries = useQueries({
    queries: ids.map((id) => scheduleOptions(id, week)),
  });
  const [saved, setSaved] = useState<{
    week: string;
    snapshots: Record<number, Snapshot<Week>>;
  }>({ week: '', snapshots: {} });

  useEffect(() => {
    let cancelled = false;
    setSaved((previous) => ({
      week,
      snapshots: Object.fromEntries(
        ids.flatMap((id) =>
          previous.week === week && previous.snapshots[id]
            ? [[id, previous.snapshots[id]]]
            : [],
        ),
      ),
    }));
    for (const id of ids) {
      if (client.getQueryData(scheduleOptions(id, week).queryKey)) continue;
      void readSavedSchedule(id, week).then((snapshot) => {
        if (cancelled || !snapshot) return;
        setSaved((previous) =>
          previous.week !== week
            ? previous
            : {
                week,
                snapshots: { ...previous.snapshots, [id]: snapshot },
              },
        );
      });
    }
    return () => {
      cancelled = true;
    };
  }, [client, ids, week]);

  const schedules: GroupSchedule[] = selection.map((group) => {
    const query = queries[ids.indexOf(group.id)];
    // A network response always wins over a slower CacheStorage read. Saved
    // fallback never replaces Query data or clears a refresh error.
    const data =
      query?.data ??
      (saved.week === week ? saved.snapshots[group.id] : undefined);
    const snapshot = usableSnapshot(
      data,
      week,
      Math.max(now, Date.now(), query?.dataUpdatedAt ?? 0),
    );
    return {
      selection: group,
      snapshot,
      error:
        query?.error?.message ||
        (data && !snapshot
          ? 'Сохранённый снимок слишком старый. Нужны данные источника.'
          : undefined),
      loading: !snapshot && (query?.isPending ?? false),
    };
  });

  const deadlines = ids.flatMap((id, index) => {
    const data =
      queries[index]?.data ??
      (saved.week === week ? saved.snapshots[id] : undefined);
    const change = snapshotChangeAt(data, week, now);
    return change === undefined ? [] : [change];
  });
  const changeAt = deadlines.length ? Math.min(...deadlines) : undefined;
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
    return () => {
      window.removeEventListener('focus', updateClock);
      window.removeEventListener('online', updateClock);
    };
  }, []);

  return {
    schedules,
    pending: schedules.some((group) => group.loading),
    fetching: queries.some((query) => query.isFetching),
    revision: queries.map((query) => [
      query.dataUpdatedAt,
      query.errorUpdatedAt,
    ]),
  };
}

export function useComparison(notify: Notify) {
  const client = useQueryClient();
  const [state, setState] = useState(initialView);
  const stateRef = useRef(state);
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  const changedRef = useRef<() => void>(() => {});
  const [subgroupCatalog, setSubgroupCatalog] = useState(savedSubgroups);
  const catalogRef = useRef(subgroupCatalog);
  catalogRef.current = subgroupCatalog;
  const reportKey = useRef('');
  const reportedLoads = useRef(new Set<string>());
  const reportedSelections = useRef(new Map<number, string>());
  const [colors, setColors] = useState(() =>
    assignColors(
      state.groups.map((group) => group.id),
      savedColors(),
    ),
  );

  // Stable methods read synchronously updated refs. A date/subgroup change and
  // its URL are one operation even before React commits the next render.
  const view = useMemo<ComparisonView>(() => {
    function apply(value: ViewState) {
      stateRef.current = value;
      setState(value);
    }
    function change(value: Partial<ViewState>) {
      apply({ ...stateRef.current, ...value });
      changedRef.current();
    }
    function reorder(groups: Selection[]) {
      change({ groups });
      track('groups_reordered', { group_count: groups.length });
    }
    return {
      get groups() {
        return stateRef.current.groups;
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
          groups: stateRef.current.groups.map(
            ({ id, label, subgroup, subgroupNumber }) => ({
              id,
              label,
              subgroup,
              subgroupNumber,
            }),
          ),
        };
      },
      apply,
      reorder,
      selectDate(value) {
        if (!validDate(value)) return;
        change({ week: monday(value), day: value });
        track('date_selected');
      },
      add(group) {
        const groups = stateRef.current.groups;
        if (
          groups.length >= 30 ||
          groups.some((existing) => existing.id === group.id)
        )
          return;
        change({ groups: [...groups, group] });
        notifyRef.current(`${group.label} добавлена.`);
        track('group_added', {
          ...selectionData(group),
          group_count: groups.length + 1,
        });
      },
      remove(id) {
        const groups = stateRef.current.groups;
        const removed = groups.find((group) => group.id === id);
        if (!removed) return;
        change({ groups: groups.filter((group) => group.id !== id) });
        notifyRef.current(`${removed.label} убрана из сравнения.`);
        track('group_removed', {
          ...selectionData(removed),
          group_count: groups.length - 1,
        });
      },
      subgroup(id, value) {
        const number = publicSubgroup(
          catalogRef.current[id]?.find((subgroup) => subgroup.id === value)
            ?.label ?? '',
        );
        change({
          groups: stateRef.current.groups.map((group) =>
            group.id === id
              ? { ...group, subgroup: value, subgroupNumber: number }
              : group,
          ),
        });
        const group = stateRef.current.groups.find((group) => group.id === id);
        if (group) track('subgroup_changed', selectionData(group));
      },
      resolveSubgroups(known) {
        let updated = false;
        const groups = stateRef.current.groups.map((group) => {
          const options = known[group.id] ?? [];
          const match = group.subgroup
            ? options.find((option) => option.id === group.subgroup)
            : group.subgroupNumber
              ? options.find(
                  (option) =>
                    publicSubgroup(option.label) === group.subgroupNumber,
                )
              : undefined;
          if (!match) return group;
          const number = publicSubgroup(match.label);
          if (group.subgroup === match.id && group.subgroupNumber === number)
            return group;
          updated = true;
          return { ...group, subgroup: match.id, subgroupNumber: number };
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
        change({ week, day: addDays(week, offset) });
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
        change({ day: value });
        track('day_changed');
      },
      selectMode(mode) {
        change({ mode });
        track('mode_changed', { mode });
      },
      move(id, offset) {
        const groups = stateRef.current.groups;
        const index = groups.findIndex((group) => group.id === id),
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
  }, []);

  const [linkState, setLinkState] = useState(() => ({
    opening: typeof location !== 'undefined' && location.pathname !== '/',
    error: '',
    sharing: false,
    manual: '',
  }));
  const linkRef = useRef(linkState);
  const readController = useRef<AbortController | undefined>(undefined);
  const links = useMemo<ComparisonLinks>(() => {
    function update(next: Partial<typeof linkState>) {
      linkRef.current = { ...linkRef.current, ...next };
      setLinkState(linkRef.current);
    }
    function canonicalize() {
      if (linkRef.current.opening || linkRef.current.error) return;
      const value = view.current();
      rememberGroups(value.groups);
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
      get sharing() {
        return linkRef.current.sharing;
      },
      get manual() {
        return linkRef.current.manual;
      },
      canonicalize,
      sync() {
        update({ manual: '' });
        const value = view.current();
        rememberGroups(value.groups);
        history.pushState(
          { campusView: value },
          '',
          viewURL(value, new URL(location.href)),
        );
      },
      async copy() {
        if (linkRef.current.sharing) return;
        update({ sharing: true, manual: '' });
        const value = view.current(),
          url = viewURL(value, new URL(location.origin)).href;
        canonicalize();
        try {
          // No await before writeText: preserve Safari's clipboard activation.
          await navigator.clipboard.writeText(url);
          notifyRef.current('Ссылка скопирована. Можно отправлять другу.');
          track('share_link_copied', {
            link_format: 'readable',
            group_count: value.groups.length,
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
            group_count: value.groups.length,
            mode: value.mode,
          });
          notifyRef.current('Ссылка скопирована.');
          update({ manual: '' });
        } catch {
          notifyRef.current('Выдели ссылку и скопируй её вручную.', 'info');
        }
      },
    };
  }, [view]);
  changedRef.current = links.sync;

  useEffect(() => {
    function update(next: Partial<typeof linkState>) {
      linkRef.current = { ...linkRef.current, ...next };
      setLinkState(linkRef.current);
    }
    async function openLocation(url: URL) {
      readController.current?.abort();
      const controller = new AbortController();
      readController.current = controller;
      const signal = controller.signal,
        id = shareID(url);
      update({ error: '', manual: '', opening: true });
      try {
        if (!id && url.pathname.startsWith('/s/'))
          throw new Error('Ссылка на сравнение не найдена.');
        const readable = readableGroups(url);
        const value = id
          ? normalizeView(await readShare(id, signal))
          : readable !== undefined
            ? await resolveReadable(url, client, signal)
            : parseView(url);
        if (signal.aborted) return;
        view.apply(value);
        if (id || readable !== undefined) {
          reportKey.current = '';
          reportedSelections.current = new Map();
          track('share_opened', {
            link_format: id ? 'legacy' : 'readable',
            group_count: value.groups.length,
            mode: value.mode,
          });
        }
        update({ opening: false });
        links.canonicalize();
      } catch (error) {
        if (!signal.aborted)
          update({
            error:
              error instanceof Error
                ? error.message
                : 'Не удалось открыть сравнение.',
          });
      } finally {
        if (!signal.aborted) update({ opening: false });
      }
    }
    const url = new URL(location.href);
    if (url.pathname !== '/') void openLocation(url);
    else {
      if (!url.searchParams.has('g')) {
        try {
          const groups = JSON.parse(
            localStorage.getItem('campus-groups') ?? '[]',
          );
          view.apply(normalizeView({ ...view.current(), groups }));
        } catch {}
      }
      if (view.groups.length) links.canonicalize();
      else
        history.replaceState({ campusView: view.current() }, '', location.href);
    }
    function onBack(event: PopStateEvent) {
      if (!event.state?.campusView) {
        void openLocation(new URL(location.href));
        return;
      }
      readController.current?.abort();
      update({ opening: false, error: '', manual: '' });
      view.apply(normalizeView(event.state.campusView));
      links.canonicalize();
    }
    window.addEventListener('popstate', onBack);
    return () => {
      readController.current?.abort();
      window.removeEventListener('popstate', onBack);
    };
  }, [client, links, view]);

  const source = useSchedules(
    state.groups,
    state.week,
    !linkState.opening && !linkState.error,
  );
  const busy = linkState.opening || source.pending;
  const fetching = linkState.opening || source.fetching;

  useEffect(() => {
    if (view.resolveSubgroups(subgroupCatalog)) links.canonicalize();
  }, [state.groups, subgroupCatalog, view, links]);

  const colorKey = state.groups.map((group) => group.id).join(',');
  useEffect(() => {
    if (!colorKey) return;
    const ids = colorKey.split(',').map(Number);
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
    const snapshots = source.schedules.filter((group) => group.snapshot);
    if (!snapshots.length) return;
    setSubgroupCatalog((previous) => {
      const next = { ...previous };
      for (const group of snapshots)
        next[group.selection.id] = mergeSubgroups(
          next[group.selection.id] ?? [],
          group.snapshot!.data.subgroups,
        );
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
    if (fetching || !state.groups.length) return;
    const revision = JSON.stringify([
      state.week,
      state.groups.map((group) => group.id).sort((a, b) => a - b),
      source.revision,
    ]);
    if (reportedLoads.current.has(revision)) return;
    reportedLoads.current.add(revision);
    const currentWeek = monday(omskToday());
    track('schedule_loaded', {
      group_count: state.groups.length,
      success: source.schedules.every((group) => !!group.snapshot),
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
        .sort((a, b) => a.id - b.id)
        .map((group) => [
          group.id,
          group.subgroupNumber ? `s${group.subgroupNumber}` : group.subgroup,
        ]),
      state.week,
      state.mode,
    ]);
    if (
      state.groups.length < 2 ||
      busy ||
      source.schedules.some((group) => !group.snapshot) ||
      signature === reportKey.current
    )
      return;
    reportKey.current = signature;
    const results = Array.from({ length: 7 }, (_, index) =>
      compareDay(source.schedules, addDays(state.week, index)),
    );
    track('comparison_used', {
      group_count: state.groups.length,
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
    const next = new Map<number, string>();
    for (const group of source.schedules) {
      if (!group.snapshot) continue;
      const signature = JSON.stringify([
        group.selection.id,
        group.selection.subgroupNumber
          ? `s${group.selection.subgroupNumber}`
          : group.selection.subgroup,
      ]);
      next.set(group.selection.id, signature);
      if (reportedSelections.current.get(group.selection.id) !== signature)
        track('group_selected', selectionData(group.selection));
    }
    reportedSelections.current = next;
  }, [busy, source.schedules]);

  return { view, links, source, colors, subgroupCatalog };
}
