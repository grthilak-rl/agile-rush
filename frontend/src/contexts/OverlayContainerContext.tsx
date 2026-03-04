import { createContext, useContext, type RefObject, type ReactNode } from 'react';

const OverlayContainerContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export function OverlayContainerProvider({
  containerRef,
  children,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}) {
  return (
    <OverlayContainerContext.Provider value={containerRef}>
      {children}
    </OverlayContainerContext.Provider>
  );
}

export function useOverlayContainer(): HTMLDivElement | null {
  const ref = useContext(OverlayContainerContext);
  return ref?.current ?? null;
}
