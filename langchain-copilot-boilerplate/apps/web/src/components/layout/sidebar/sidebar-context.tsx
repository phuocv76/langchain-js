'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

interface SidebarValue {
  readonly sidebarOpen: boolean;
  readonly toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarValue | null>(null);

/** UI-only state for the history sidebar (open / collapsed). */
export const SidebarProvider = ({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), []);

  const value = useMemo<SidebarValue>(
    () => ({ sidebarOpen, toggleSidebar }),
    [sidebarOpen, toggleSidebar],
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
};

export const useSidebar = (): SidebarValue => {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return ctx;
};
