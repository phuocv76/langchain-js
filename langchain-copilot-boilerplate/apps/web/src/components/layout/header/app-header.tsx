'use client';

// Libs for third party
import { PanelLeftOpen } from 'lucide-react';

// Internal
import { useSidebar } from '@/components/layout/sidebar/sidebar-context';
import { ThemeToggle } from '@/components/theme/theme-toggle';

/** Top app bar with the sidebar toggle and theme switcher. */
export const AppHeader = (): React.JSX.Element => {
  const { sidebarOpen, toggleSidebar } = useSidebar();

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        {!sidebarOpen && (
          <button
            type="button"
            onClick={toggleSidebar}
            title="Open sidebar"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <PanelLeftOpen className="h-4 w-4" />
            <span className="sr-only">Open sidebar</span>
          </button>
        )}
      </div>
      <ThemeToggle />
    </header>
  );
};
