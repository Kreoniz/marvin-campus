export type EventData = Record<string, string | number | boolean>;
const selection = ['group_label', 'selected'];
const fields: Record<string, string[]> = {
  group_added: [...selection, 'group_count'],
  group_removed: [...selection, 'group_count'],
  subgroup_changed: selection,
  group_selected: selection,
  comparison_used: ['group_count', 'mode', 'has_overlap', 'stale'],
  schedule_loaded: ['group_count', 'success', 'stale', 'week_relation'],
  share_opened: ['link_format', 'group_count', 'mode'],
  share_link_copied: ['link_format', 'group_count', 'mode'],
  lesson_opened: ['remote'],
  theme_changed: ['theme'],
  mode_changed: ['mode'],
  groups_reordered: ['group_count'],
  week_changed: ['week_relation'],
  day_changed: [],
  date_selected: [],
  mobile_view_changed: ['view'],
};
function valid(key: string, value: string | number | boolean): boolean {
  if (key === 'group_label')
    return (
      typeof value === 'string' &&
      /^[А-ЯЁA-Z0-9]{1,16}-\d{2,5}$|^\d{1,8}$/u.test(value)
    );
  if (key === 'group_count')
    return (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 30
    );
  const choices: Record<string, string[]> = {
    mode: ['presence', 'free'],
    theme: ['light', 'dark'],
    week_relation: ['past', 'current', 'future'],
    link_format: ['legacy', 'readable'],
    view: ['day', 'week', 'list'],
  };
  if (choices[key])
    return typeof value === 'string' && choices[key].includes(value);
  return typeof value === 'boolean';
}
export function analyticsData(
  name: string,
  data: EventData,
): EventData | undefined {
  if (!Object.hasOwn(fields, name)) return;
  const allowed = fields[name];
  return Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) => allowed.includes(key) && valid(key, value),
    ),
  );
}
