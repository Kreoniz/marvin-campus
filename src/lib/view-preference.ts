export type ScheduleView = 'day' | 'week' | 'list';

export function savedScheduleView(vucOnly: boolean): ScheduleView | undefined {
  try {
    const value = localStorage.getItem(
      vucOnly ? 'campus-vuc-view' : 'campus-view',
    );
    return value === 'day' || value === 'week' || value === 'list'
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

export function rememberScheduleView(vucOnly: boolean, view: ScheduleView) {
  try {
    localStorage.setItem(vucOnly ? 'campus-vuc-view' : 'campus-view', view);
  } catch {
    // The in-memory choice still works when storage is unavailable.
  }
}
