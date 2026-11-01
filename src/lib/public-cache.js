// Shared by foreground reads/handoff and the standalone worker (inlined at build).
export const PUBLIC_DATA_CACHE = 'campus-public-data-v1';
export const PUBLIC_DATA_LIMIT = 100;
export const PUBLIC_BODY_LIMIT = 2 * 1024 * 1024;
const DAY = 86400000;

function validDate(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}
function mondayOf(value) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
export function publicDataTarget(url) {
  let kind, id;
  const group = /^\/api\/schedule\/([1-9]\d{0,7})$/.exec(url.pathname);
  const resource =
    /^\/api\/resources\/(lecturer|auditorium)\/([1-9]\d{0,7})$/.exec(
      url.pathname,
    );
  const vuc = /^\/api\/vuc\/([a-z0-9][a-z0-9._-]{0,99})$/.exec(url.pathname);
  if (group) {
    kind = 'group';
    id = Number(group[1]);
  } else if (resource) {
    kind = resource[1];
    id = Number(resource[2]);
  } else if (vuc) {
    kind = 'vuc';
    id = vuc[1];
  } else if (
    url.pathname === '/api/vuc' &&
    [...url.searchParams.keys()].every((key) => key === 'term') &&
    !url.searchParams.get('term')
  )
    return { kind: 'catalogue', key: `${url.origin}/api/vuc?term=` };
  else if (
    /^\/api\/share\/[A-Za-z0-9_-]{12}$/.test(url.pathname) &&
    !url.search
  )
    return { kind: 'share', key: url.origin + url.pathname };
  else return;
  const week = url.searchParams.get('week');
  if (
    (typeof id === 'number' && id > 10000000) ||
    !validDate(week) ||
    mondayOf(week) !== week ||
    url.searchParams.getAll('week').length !== 1 ||
    [...url.searchParams.keys()].some(
      (key) => key !== 'week' && key !== 'refresh',
    )
  )
    return;
  return { kind, id, week, key: `${url.origin}${url.pathname}?week=${week}` };
}
function validTimes(body) {
  return (
    body &&
    typeof body.stale === 'boolean' &&
    typeof body.checkedAt === 'string' &&
    Number.isFinite(Date.parse(body.checkedAt)) &&
    typeof body.expiresAt === 'string' &&
    Number.isFinite(Date.parse(body.expiresAt)) &&
    (body.warning === undefined || typeof body.warning === 'string')
  );
}
function inWeek(value, week) {
  return (
    validDate(value) &&
    value >= week &&
    Date.parse(value) < Date.parse(week) + 7 * DAY
  );
}
const optional = (value, valid) => value === undefined || valid(value);
const stringList = (value) =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
function interval(value) {
  return (
    value &&
    Number.isInteger(value.start) &&
    Number.isInteger(value.end) &&
    value.start >= 0 &&
    value.end <= 1440 &&
    value.start < value.end
  );
}
function resourceRef(value, kind) {
  return (
    value &&
    value.kind === kind &&
    Number.isSafeInteger(value.id) &&
    value.id > 0 &&
    value.id <= 10000000 &&
    typeof value.label === 'string' &&
    optional(value.source, (source) => source === 'rasp')
  );
}
function validLesson(lesson, week) {
  return (
    lesson &&
    ['id', 'subject', 'teacher', 'room', 'kind', 'building'].every(
      (key) => typeof lesson[key] === 'string',
    ) &&
    inWeek(lesson.date, week) &&
    typeof lesson.remote === 'boolean' &&
    Number.isInteger(lesson.start) &&
    Number.isInteger(lesson.end) &&
    lesson.start >= 0 &&
    lesson.end <= 1440 &&
    lesson.start < lesson.end &&
    Array.isArray(lesson.subgroups) &&
    lesson.subgroups.every((id) => Number.isInteger(id) && id > 0) &&
    ['source', 'audience', 'rawText', 'sourceOrigin'].every((key) =>
      optional(lesson[key], (value) => typeof value === 'string'),
    ) &&
    optional(lesson.audiences, stringList) &&
    optional(lesson.metadataWarnings, stringList) &&
    optional(
      lesson.teachers,
      (value) =>
        Array.isArray(value) &&
        value.every((ref) => resourceRef(ref, 'lecturer')),
    ) &&
    optional(lesson.roomRef, (value) => resourceRef(value, 'auditorium')) &&
    optional(
      lesson.sourceIntervals,
      (value) => Array.isArray(value) && value.every(interval),
    ) &&
    optional(
      lesson.sourceBounds,
      (value) =>
        value &&
        Number.isFinite(value.left) &&
        Number.isFinite(value.right) &&
        value.left <= value.right &&
        ['pt', 'twip'].includes(value.unit),
    )
  );
}
export function validPublicBody(target, body) {
  if (!target) return false;
  if (target.kind === 'share')
    return (
      Array.isArray(body?.groups) &&
      body.groups.length <= 30 &&
      validDate(body.week) &&
      validDate(body.day)
    );
  if (!validTimes(body)) return false;
  if (target.kind === 'catalogue')
    return (
      Array.isArray(body.data) &&
      body.data.length <= 2000 &&
      body.data.every(
        (ref) =>
          ref &&
          ref.kind === 'vuc' &&
          (ref.source === undefined || ref.source === 'vuc') &&
          ref.subgroup === undefined &&
          ref.subgroupNumber === undefined &&
          typeof ref.id === 'string' &&
          /^[a-z0-9][a-z0-9._-]{0,99}$/.test(ref.id) &&
          typeof ref.label === 'string' &&
          ref.label.trim().length > 0 &&
          ref.label.length <= 160 &&
          optional(ref.warnings, stringList) &&
          ['description', 'sourceLabel', 'sourcePeriod'].every((key) =>
            optional(ref[key], (value) => typeof value === 'string'),
          ) &&
          (ref.coveredDates === undefined ||
            (Array.isArray(ref.coveredDates) &&
              ref.coveredDates.length <= 200 &&
              ref.coveredDates.every(validDate))) &&
          (ref.firstDate === undefined || validDate(ref.firstDate)) &&
          (ref.lastDate === undefined || validDate(ref.lastDate)) &&
          (ref.originalAvailable === undefined ||
            typeof ref.originalAvailable === 'boolean'),
      )
    );
  const data = body.data;
  if (
    !data ||
    !Array.isArray(data.lessons) ||
    !data.lessons.every((lesson) => validLesson(lesson, target.week)) ||
    !optional(data.warnings, stringList) ||
    !['sourceLabel', 'sourcePeriod', 'importedAt'].every((key) =>
      optional(data[key], (value) => typeof value === 'string'),
    ) ||
    !optional(
      data.unparsedCells,
      (value) =>
        Array.isArray(value) &&
        value.every(
          (cell) =>
            cell &&
            inWeek(cell.date, target.week) &&
            ['rawText', 'sourceOrigin', 'reason'].every(
              (key) => typeof cell[key] === 'string',
            ),
        ),
    )
  )
    return false;
  if (target.kind === 'group')
    return (
      data.groupId === target.id &&
      data.kind === undefined &&
      data.id === undefined &&
      Array.isArray(data.subgroups) &&
      data.subgroups.every(
        (ref) =>
          ref &&
          Number.isInteger(ref.id) &&
          ref.id > 0 &&
          typeof ref.label === 'string',
      )
    );
  if (
    data.kind !== target.kind ||
    data.id !== target.id ||
    data.groupId !== undefined
  )
    return false;
  if (target.kind !== 'vuc') return true;
  return (
    Array.isArray(data.coveredDates) &&
    data.coveredDates.every((date) => inWeek(date, target.week)) &&
    (data.unresolvedDates === undefined ||
      (Array.isArray(data.unresolvedDates) &&
        data.unresolvedDates.every((date) => inWeek(date, target.week)))) &&
    (data.originalAvailable === undefined ||
      typeof data.originalAvailable === 'boolean')
  );
}
export function publicSnapshotDeadline(body, week, now = Date.now()) {
  // Match cache-policy: Omsk Monday can shorten the future-week TTL.
  const currentWeek = mondayOf(
    new Date(now + 6 * 3600000).toISOString().slice(0, 10),
  );
  week ??= currentWeek; // The VUC catalogue follows the existing catalogue reader's policy.
  const ttl = week < currentWeek ? DAY : week > currentWeek ? 3600000 : 1800000;
  return Math.min(Date.parse(body.expiresAt), Date.parse(body.checkedAt) + ttl);
}
export function publicBodyUsable(target, body, now = Date.now()) {
  return (
    validPublicBody(target, body) &&
    (target.kind === 'share' ||
      now <= publicSnapshotDeadline(body, target.week, now) + DAY)
  );
}
export function publicBodyText(body) {
  const text = JSON.stringify(body);
  return new TextEncoder().encode(text).byteLength <= PUBLIC_BODY_LIMIT
    ? text
    : undefined;
}
export async function readPublicResponse(response) {
  if (
    !response?.ok ||
    Number(response.headers.get('Content-Length')) > PUBLIC_BODY_LIMIT
  )
    return;
  const reader = response.body?.getReader();
  if (!reader) return;
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > PUBLIC_BODY_LIMIT) {
      void reader.cancel().catch(() => {});
      return;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
