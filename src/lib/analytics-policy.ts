export type EventData = Record<string, string | number | boolean>;
const selection = [
  'group_id',
  'group_label',
  'subgroup_id',
  'subgroup_number',
  'subgroup_label',
];
const fields: Record<string, string[]> = {
  group_added: [...selection, 'group_count'],
  group_removed: [...selection, 'group_count'],
  subgroup_changed: [...selection, 'selected'],
  group_selected: [...selection, 'source_share_id'],
  comparison_used: [
    'group_count',
    'mode',
    'has_overlap',
    'stale',
    'source_share_id',
  ],
  schedule_loaded: ['group_count', 'success', 'stale', 'week_relation'],
  share_opened: ['share_id', 'link_format', 'group_count', 'mode'],
  share_link_copied: ['share_id', 'link_format', 'group_count', 'mode'],
  lesson_opened: ['remote'],
  theme_changed: ['theme'],
  mode_changed: ['mode'],
  groups_reordered: ['group_count'],
  week_changed: ['week_relation'],
  day_changed: [],
  date_selected: [],
};
const validShareID = (value: unknown) =>
  typeof value === 'string' &&
  /^(r1-[0-9a-f]{16}|[A-Za-z0-9_-]{12})$/.test(value);
function valid(key: string, value: string | number | boolean): boolean {
  if (key === 'share_id' || key === 'source_share_id')
    return validShareID(value);
  if (key === 'group_id' || key === 'subgroup_id')
    return (
      (key === 'subgroup_id' && (value === 'all' || value === 'unresolved')) ||
      (typeof value === 'number' &&
        Number.isSafeInteger(value) &&
        value > 0 &&
        value <= 10000000)
    );
  if (key === 'group_label')
    return (
      typeof value === 'string' &&
      /^[А-ЯЁA-Z0-9]{1,16}-\d{2,5}$|^\d{1,8}$/u.test(value)
    );
  if (key === 'subgroup_label')
    return (
      typeof value === 'string' &&
      (value === 'Вся группа' ||
        /^[А-ЯЁA-Z0-9]{1,16}-\d{2,5}(\/\d{1,2})?$|^\d{1,8}(\/\d{1,2})?$|^unresolved$/u.test(
          value,
        ))
    );
  if (key === 'group_count')
    return (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 30
    );
  if (key === 'subgroup_number')
    return (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value > 0 &&
      value < 100
    );
  const choices: Record<string, string[]> = {
    mode: ['presence', 'free'],
    theme: ['light', 'dark'],
    week_relation: ['past', 'current', 'future'],
    link_format: ['legacy', 'readable'],
  };
  if (choices[key])
    return typeof value === 'string' && choices[key].includes(value);
  return typeof value === 'boolean';
}
export function analyticsData(
  name: string,
  data: EventData,
  source?: string,
): EventData | undefined {
  const allowed = fields[name];
  if (!allowed) return;
  const values = { ...data };
  if (allowed.includes('source_share_id') && validShareID(source))
    values.source_share_id = source!;
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key, value]) => allowed.includes(key) && valid(key, value),
    ),
  );
}
