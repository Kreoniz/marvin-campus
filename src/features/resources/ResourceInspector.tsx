import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { ResourceRef, Selection } from '../../lib/types.ts';
import { validSelection } from '../../lib/schedule-ref.ts';

type AddResource = (
  resource: ResourceRef,
  trigger?: HTMLElement | null,
  date?: string,
) => void;
const ResourceContext = createContext<{ openResource: AddResource }>({
  openResource: () => {},
});

export function useResourceInspector() {
  return useContext(ResourceContext);
}

// Linked metadata adds to the same calendar instead of opening another view.
export function ResourceProvider({
  onAdd,
  children,
}: {
  onAdd: (selection: Selection) => void;
  children: ReactNode;
}) {
  const openResource = useCallback<AddResource>(
    (resource, trigger) => {
      if (!validSelection(resource)) return;
      onAdd(resource);
      requestAnimationFrame(() => {
        (trigger?.isConnected
          ? trigger
          : document.querySelector<HTMLButtonElement>('.add-group')
        )?.focus({ preventScroll: true });
      });
    },
    [onAdd],
  );
  const value = useMemo(() => ({ openResource }), [openResource]);
  return (
    <ResourceContext.Provider value={value}>
      {children}
    </ResourceContext.Provider>
  );
}
