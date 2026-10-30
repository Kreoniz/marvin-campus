export type Mode = 'presence' | 'free';
export type ScheduleKind = 'group' | 'lecturer' | 'auditorium' | 'vuc';
export type ScheduleKey = string;
export interface Group {
  id: number;
  label: string;
  description?: string;
}
export interface GroupSelection extends Group {
  kind?: 'group';
  source?: 'rasp';
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
export type ResourceKind = 'lecturer' | 'auditorium';
export interface ResourceRef {
  kind: ResourceKind;
  source?: 'rasp';
  id: number;
  label: string;
  description?: string;
  subgroup?: undefined;
  subgroupNumber?: undefined;
}
export interface VucRef {
  kind: 'vuc';
  source?: 'vuc';
  id: string;
  label: string;
  description?: string;
  firstDate?: string;
  lastDate?: string;
  coveredDates?: string[];
  sourceLabel?: string;
  sourcePeriod?: string;
  warnings?: string[];
  subgroup?: undefined;
  subgroupNumber?: undefined;
}
export type Selection = GroupSelection | ResourceRef | VucRef;
export interface ScheduleData {
  // Present only on official academic group responses.
  groupId?: number;
  lessons: Lesson[];
  subgroups?: Subgroup[];
  coveredDates?: string[];
  unresolvedDates?: string[];
  sourceLabel?: string;
  sourcePeriod?: string;
  warnings?: string[];
  importedAt?: string;
  unparsedCells?: {
    date: string;
    rawText: string;
    sourceOrigin: string;
    reason: string;
  }[];
}
export interface ResourceWeek extends ScheduleData {
  kind: ResourceKind;
  id: number;
}
export interface VucWeek extends ScheduleData {
  kind: 'vuc';
  id: string;
  coveredDates: string[];
}
export interface Lesson extends Interval {
  id: string;
  // Official endpoints share one namespace. Imported document identities do not.
  source?: string;
  date: string;
  subject: string;
  kind: string;
  building: string;
  room: string;
  teacher: string;
  teachers?: ResourceRef[];
  roomRef?: ResourceRef;
  audience?: string;
  audiences?: string[];
  metadataWarnings?: string[];
  rawText?: string;
  sourceOrigin?: string;
  sourceIntervals?: Interval[];
  sourceBounds?: { left: number; right: number; unit: 'pt' | 'twip' };
  remote: boolean;
  subgroups: number[];
}
export interface Week extends ScheduleData {
  groupId: number;
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
  snapshot?: Snapshot<ScheduleData>;
  error?: string;
  loading?: boolean;
  fetching?: boolean;
}
export interface DayResult {
  presence: Interval[];
  free: Interval[];
  lessons: Lesson[];
  complete: boolean;
}
