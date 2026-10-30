import { monday, omskToday, validDate, addDays } from './dates.ts';
import type { Group, Mode, Selection } from './types.ts';
import { encodeGroupCode, decodeGroupCode } from './transliteration.ts';
import { isGroup, scheduleKey, validSelection } from './schedule-ref.ts';

export interface ViewState {
  groups: Selection[];
  week: string;
  day: string;
  mode: Mode;
}
export function groupSlug(group: Group): string {
  return encodeGroupCode(group.label) ?? `g${group.id}`;
}
export interface GroupRequest {
  slug: string;
  label: string;
  id?: number;
  subgroup?: number;
  subgroupNumber?: number;
}
// Undefined is a legacy/root URL; an empty array is an invalid readable path.
export function readableGroups(url: URL): GroupRequest[] | undefined {
  if (
    url.pathname === '/' ||
    url.pathname === '/compare' ||
    url.pathname === '/vuc' ||
    url.pathname.startsWith('/s/')
  )
    return;
  let path: string;
  try {
    path = decodeURIComponent(url.pathname)
      .replace(/^\/|\/$/g, '')
      .toLowerCase();
  } catch {
    return [];
  }
  const parts = path.split('+');
  if (parts.length > 30) return [];
  const requests: GroupRequest[] = [];
  for (const part of parts) {
    const match =
      /^(g\d{1,8}|~?[a-z_]{1,112}-\d{2,5})(?:-(s\d{1,2}|sid\d{1,8}))?$/.exec(
        part,
      );
    if (!match) return [];
    const [, slug, suffix] = match;
    if (requests.some((g) => g.slug === slug)) continue;
    const id = /^g\d+$/.test(slug) ? Number(slug.slice(1)) : undefined;
    if (id !== undefined && (id <= 0 || id > 10000000)) return [];
    const subgroup = suffix?.startsWith('sid')
      ? Number(suffix.slice(3))
      : undefined;
    const subgroupNumber =
      suffix && !suffix.startsWith('sid') ? Number(suffix.slice(1)) : undefined;
    if (subgroup === 0 || subgroupNumber === 0) return [];
    const label = id ? `Группа ${id}` : decodeGroupCode(slug);
    if (!label) return [];
    requests.push({
      slug,
      label,
      ...(id ? { id } : {}),
      ...(subgroup ? { subgroup } : {}),
      ...(subgroupNumber ? { subgroupNumber } : {}),
    });
  }
  return requests;
}
export function parseView(
  url: URL,
  today = omskToday(),
  known: Group[] = [],
): ViewState {
  const groups: Selection[] = [];
  const requests = readableGroups(url);
  if (url.pathname === '/compare' || url.pathname === '/vuc') {
    const encoded = url.searchParams.getAll('s');
    if (encoded.length <= 30) {
      for (const entry of encoded) {
        let candidate: unknown;
        try {
          candidate = JSON.parse(entry);
        } catch {
          groups.length = 0;
          break;
        }
        const parsed = cleanSelection(candidate);
        if (!parsed || (url.pathname === '/vuc' && parsed.kind !== 'vuc')) {
          groups.length = 0;
          break;
        }
        if (!groups.some((group) => scheduleKey(group) === scheduleKey(parsed)))
          groups.push(parsed);
      }
    }
  } else if (requests) {
    for (const request of requests) {
      const matches = known.filter((g) => groupSlug(g) === request.slug);
      const group = request.id
        ? { id: request.id, label: request.label }
        : new Set(matches.map((g) => g.id)).size === 1
          ? matches[0]
          : undefined;
      if (group && !groups.some((g) => g.id === group.id))
        groups.push({
          id: group.id,
          label: group.label,
          ...(request.subgroup ? { subgroup: request.subgroup } : {}),
          ...(request.subgroupNumber
            ? { subgroupNumber: request.subgroupNumber }
            : {}),
        });
    }
  } else
    for (const value of url.searchParams.getAll('g').slice(0, 30)) {
      const [rawID, label, rawSubgroup] = value.split('~');
      const id = Number(rawID),
        subgroup = Number(rawSubgroup);
      if (
        !Number.isSafeInteger(id) ||
        id <= 0 ||
        id > 10000000 ||
        groups.some((g) => g.id === id)
      )
        continue;
      groups.push({
        id,
        label: label?.slice(0, 80) || `Группа ${id}`,
        ...(Number.isSafeInteger(subgroup) && subgroup > 0 ? { subgroup } : {}),
      });
    }
  const requested = url.searchParams.get('week') ?? '';
  const requestedDay =
    url.searchParams.get('d') ?? url.searchParams.get('day') ?? '';
  const defaultDay =
    new Date(`${today}T12:00:00Z`).getUTCDay() === 0
      ? addDays(today, 1)
      : today;
  const week = validDate(requested)
    ? monday(requested)
    : monday(!requested && validDate(requestedDay) ? requestedDay : defaultDay);
  const day =
    validDate(requestedDay) &&
    requestedDay >= week &&
    requestedDay <= addDays(week, 6)
      ? requestedDay
      : week === monday(defaultDay) && !validDate(requested)
        ? defaultDay
        : week === monday(today)
          ? today
          : week;
  return {
    groups,
    week,
    day,
    mode:
      (url.searchParams.get('v') ?? url.searchParams.get('mode')) === 'presence'
        ? 'presence'
        : 'free',
  };
}
// History and legacy /s/id payloads already contain IDs; no directory lookup.
export function normalizeView(value: ViewState): ViewState {
  const groups = (Array.isArray(value.groups) ? value.groups : [])
    .slice(0, 30)
    .flatMap((group) => {
      const clean = cleanSelection(group);
      return clean ? [clean] : [];
    });
  const url = new URL('https://campus.example/');
  url.searchParams.set('week', value.week);
  url.searchParams.set('d', value.day);
  url.searchParams.set('v', value.mode);
  if (groups.some((group) => !isGroup(group))) {
    url.pathname = '/compare';
    for (const group of groups)
      url.searchParams.append('s', JSON.stringify(group));
  } else {
    for (const group of groups)
      url.searchParams.append(
        'g',
        `${group.id}~${group.label}${group.subgroup ? `~${group.subgroup}` : ''}`,
      );
  }
  const result = parseView(url);
  result.groups = result.groups.map((group) => {
    if (!isGroup(group)) return group;
    const number = groups.find(
      (g) => scheduleKey(g) === scheduleKey(group),
    )?.subgroupNumber;
    return Number.isInteger(number) && number! > 0 && number! < 100
      ? { ...group, subgroupNumber: number }
      : group;
  });
  return result;
}
function cleanSelection(value: unknown): Selection | undefined {
  if (!validSelection(value)) return undefined;
  const base = {
    id: value.id,
    label: value.label.trim(),
    ...(value.description && value.description.length <= 240
      ? { description: value.description }
      : {}),
  };
  if (value.kind === 'vuc')
    return {
      ...base,
      id: value.id,
      kind: 'vuc',
      ...(value.firstDate && validDate(value.firstDate)
        ? { firstDate: value.firstDate }
        : {}),
      ...(value.lastDate && validDate(value.lastDate)
        ? { lastDate: value.lastDate }
        : {}),
      ...(Array.isArray(value.coveredDates)
        ? {
            coveredDates: value.coveredDates
              .slice(0, 200)
              .filter((date) => typeof date === 'string' && validDate(date)),
          }
        : {}),
    };
  if (!isGroup(value)) return { ...base, id: value.id, kind: value.kind };
  return {
    ...base,
    id: value.id,
    ...(Number.isInteger(value.subgroup) &&
    value.subgroup! > 0 &&
    value.subgroup! <= 99999999
      ? { subgroup: value.subgroup }
      : {}),
    ...(Number.isInteger(value.subgroupNumber) &&
    value.subgroupNumber! > 0 &&
    value.subgroupNumber! < 100
      ? { subgroupNumber: value.subgroupNumber }
      : {}),
  };
}
export function viewURL(state: ViewState, base: URL): URL {
  const url = new URL(base);
  const typed = state.groups.some((group) => !isGroup(group));
  url.pathname =
    base.pathname === '/vuc' &&
    state.groups.every((group) => group.kind === 'vuc')
      ? '/vuc'
      : typed
        ? '/compare'
        : '/' +
          state.groups
            .filter(isGroup)
            .map(
              (group) =>
                groupSlug(group) +
                (group.subgroupNumber
                  ? `-s${group.subgroupNumber}`
                  : group.subgroup
                    ? `-sid${group.subgroup}`
                    : ''),
            )
            .join('+');
  url.search = '';
  url.hash = '';
  url.searchParams.set('d', state.day);
  url.searchParams.set('v', state.mode === 'presence' ? 'presence' : 'free');
  if (typed)
    for (const group of state.groups) {
      const clean = cleanSelection(group);
      if (clean) {
        // Full source coverage stays local; shared links carry only identity and bounds.
        const shared =
          clean.kind === 'vuc' ? { ...clean, coveredDates: undefined } : clean;
        url.searchParams.append('s', JSON.stringify(shared));
      }
    }
  return url;
}
export function shareID(url: URL): string | undefined {
  return /^\/s\/([A-Za-z0-9_-]{12})\/?$/.exec(url.pathname)?.[1];
}
