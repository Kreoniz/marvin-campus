import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { GroupSchedule, ResourceRef, Selection } from '../../lib/types.ts';
import { scheduleKey, validSelection } from '../../lib/schedule-ref.ts';

type Continuation = {
  eventKey: string;
  region: HTMLElement | null;
  popup: HTMLElement | null;
};
type AddResource = (
  resource: ResourceRef,
  trigger?: HTMLElement | null,
  date?: string,
  continuation?: Continuation,
) => void;
const ResourceContext = createContext<{
  openResource: AddResource;
  schedules: GroupSchedule[];
  militaryId: string;
  selectMilitary: (id: string) => void;
}>({
  openResource: () => {},
  schedules: [],
  militaryId: '',
  selectMilitary: () => {},
});
export function useResourceInspector() {
  return useContext(ResourceContext);
}

type PendingFocus = { key: string; restore: () => void; dispose: () => void };

// This owner outlives a card that splits during a source join. Popover return
// focus is disabled for this action; there is no competing search fallback.
export function ResourceProvider({
  onAdd,
  schedules,
  children,
}: {
  onAdd: (selection: Selection) => void;
  schedules: GroupSchedule[];
  children: ReactNode;
}) {
  const [militaryId, setMilitaryId] = useState(() => {
    try {
      const id = localStorage.getItem('campus-vuc-preview') ?? '';
      return /^[a-z0-9][a-z0-9._-]{0,99}$/.test(id) ? id : '';
    } catch {
      return '';
    }
  });
  const selectMilitary = useCallback((id: string) => {
    setMilitaryId(id);
    try {
      localStorage.setItem('campus-vuc-preview', id);
    } catch {}
  }, []);
  const pending = useRef<PendingFocus | undefined>(undefined);
  const [request, setRequest] = useState(0);
  const clear = useCallback(() => {
    pending.current?.dispose();
    pending.current = undefined;
  }, []);
  useEffect(() => clear, [clear]);
  const openResource = useCallback<AddResource>(
    (resource, trigger, _date, continuation) => {
      if (!validSelection(resource)) return;
      clear();
      if (continuation?.region && trigger) {
        const { eventKey, region, popup } = continuation;
        const matches = (element: Element) =>
          (
            JSON.parse(
              (element as HTMLElement).dataset.lessonKeys ?? '[]',
            ) as string[]
          ).includes(eventKey);
        const owns = (element: Element | null) =>
          element === trigger ||
          element === region ||
          !!(
            element &&
            (popup?.contains(element) ||
              (region.contains(element) && matches(element)))
          );
        const focus = (event: FocusEvent) => {
          if (event.target instanceof Element && !owns(event.target)) clear();
        };
        const pointer = (event: PointerEvent) => {
          if (
            event.target instanceof Element &&
            !popup?.contains(event.target) &&
            !trigger.contains(event.target)
          )
            clear();
        };
        const keyboard = () => clear();
        document.addEventListener('focusin', focus, true);
        document.addEventListener('pointerdown', pointer, true);
        document.addEventListener('keydown', keyboard, true);
        pending.current = {
          key: scheduleKey(resource),
          restore: () => {
            if (!region.isConnected) {
              clear();
              return;
            }
            const next = Array.from(
              region.querySelectorAll<HTMLButtonElement>('[data-lesson-keys]'),
            ).find(matches);
            (next ?? region).focus({ preventScroll: true });
          },
          dispose: () => {
            document.removeEventListener('focusin', focus, true);
            document.removeEventListener('pointerdown', pointer, true);
            document.removeEventListener('keydown', keyboard, true);
          },
        };
        setRequest((value) => value + 1);
        onAdd(resource);
        return;
      }
      onAdd(resource);
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (
          active &&
          active !== document.body &&
          active !== trigger &&
          active.isConnected
        )
          return;
        (trigger?.isConnected
          ? trigger
          : document.querySelector<HTMLButtonElement>('.add-group')
        )?.focus({ preventScroll: true });
      });
    },
    [clear, onAdd],
  );
  useLayoutEffect(() => {
    const action = pending.current;
    if (!action) return;
    action.restore();
    const source = schedules.find(
      (schedule) => scheduleKey(schedule.selection) === action.key,
    );
    if (source && !source.loading && (source.snapshot || source.error)) clear();
  }, [request, schedules, clear]);
  const value = useMemo(
    () => ({ openResource, schedules, militaryId, selectMilitary }),
    [openResource, schedules, militaryId, selectMilitary],
  );
  return (
    <ResourceContext.Provider value={value}>
      {children}
    </ResourceContext.Provider>
  );
}
