export type Mode = 'presence' | 'free';
export interface Group {
  id: number;
  label: string;
  description?: string;
}
export interface Selection extends Group {
  subgroup?: number;
  // Public number in readable links; source IDs are resolved from the catalog.
  subgroupNumber?: number;
}
export interface Subgroup {
  id: number;
  label: string;
}
export interface Interval {
  start: number;
  end: number;
}
export interface Lesson extends Interval {
  id: string;
  date: string;
  subject: string;
  kind: string;
  building: string;
  room: string;
  teacher: string;
  remote: boolean;
  subgroups: number[];
}
export interface Week {
  groupId: number;
  lessons: Lesson[];
  subgroups: Subgroup[];
}
export interface Snapshot<T> {
  data: T;
  checkedAt: string;
  expiresAt: string;
  stale: boolean;
  warning?: string;
}
export interface GroupSchedule {
  selection: Selection;
  snapshot?: Snapshot<Week>;
  error?: string;
  loading?: boolean;
}
export interface DayResult {
  presence: Interval[];
  free: Interval[];
  lessons: Lesson[];
  complete: boolean;
}
export interface PlacedLesson {
  lesson: Lesson;
  group: Selection;
  column: number;
  columns: number;
}
