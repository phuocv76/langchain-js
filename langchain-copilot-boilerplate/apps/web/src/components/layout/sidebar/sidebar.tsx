'use client';

// Libs for third party
import { useCopilotContext } from '@copilotkit/react-core';
import { useAgent, useThreads } from '@copilotkit/react-core/v2';
import { PanelLeftClose, Plus, MessageSquare, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Internal
import { APP_NAME } from '@repo/shared';
import { cn } from '@repo/ui/cn';
import { useSidebar } from '@/components/layout/sidebar/sidebar-context';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { AGENT_ID, COPILOT_PUBLIC_LICENSE_KEY } from '@/lib/config';

const ThreadHistoryError = ({ error }: { error: Error }): React.JSX.Element => {
  return (
    <div className="space-y-2 px-3 py-2 text-xs">
      <p className="text-red-500">
        Couldn&apos;t load history: {error.message}
      </p>
      {!COPILOT_PUBLIC_LICENSE_KEY && (
        <p className="text-muted-foreground">
          Durable history also requires CopilotKit Intelligence configuration in
          both app environments.
        </p>
      )}
    </div>
  );
};

/**
 * Renders the thread list from CopilotKit thread endpoints.
 *
 * With Enterprise Intelligence configured, threads are durable, named, and
 * update in realtime. In local-only mode the runtime keeps threads in memory
 * and this list is refreshed after each agent run (no WebSocket).
 */
const ThreadList = (): React.JSX.Element => {
  const { threads, isLoading, error } = useThreads({ agentId: AGENT_ID });
  const { threadId, setThreadId } = useCopilotContext();

  if (isLoading) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">
        Loading conversations…
      </p>
    );
  }

  if (error) {
    return <ThreadHistoryError error={error} />;
  }

  if (threads.length === 0) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">
        No conversations yet.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {threads.map((thread) => {
        const isActive = thread.id === threadId;
        const label = thread.name ?? 'New conversation';
        return (
          <li key={thread.id}>
            <button
              type="button"
              onClick={() => setThreadId(thread.id)}
              title={label}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                isActive && 'bg-accent text-foreground',
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
              <span className="truncate">{label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

/**
 * Renders {@link ThreadList} only after mount.
 *
 * `useThreads` relies on `useSyncExternalStore` without a server snapshot, which
 * throws during SSR ("Missing getServerSnapshot"). Deferring to the client
 * keeps the initial server render safe.
 */
const ThreadListClientOnly = ({
  refreshKey,
}: {
  refreshKey: number;
}): React.JSX.Element | null => {
  const mounted = useIsMounted();

  if (!mounted) {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">
        Loading conversations…
      </p>
    );
  }

  return <ThreadList key={refreshKey} />;
};

/** ChatGPT-style left sidebar: branding, new chat, and conversation history. */
export const Sidebar = (): React.JSX.Element | null => {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { setThreadId } = useCopilotContext();
  const { agent } = useAgent({ agentId: AGENT_ID });
  const [refreshKey, setRefreshKey] = useState(0);

  // Local (non-Intelligence) runtimes have no realtime thread sync — refetch
  // the list whenever an agent run finishes so new conversations appear.
  const wasRunning = useRef(false);
  useEffect(() => {
    if (wasRunning.current && !agent.isRunning) {
      setRefreshKey((k) => k + 1);
    }
    wasRunning.current = agent.isRunning;
  }, [agent.isRunning]);

  const newChat = (): void => {
    setThreadId(crypto.randomUUID());
  };

  if (!sidebarOpen) {
    return null;
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-muted/30">
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold">{APP_NAME}</span>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          title="Collapse sidebar"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <PanelLeftClose className="h-4 w-4" />
          <span className="sr-only">Collapse sidebar</span>
        </button>
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={newChat}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <p className="px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          History
        </p>
        <ThreadListClientOnly refreshKey={refreshKey} />
      </nav>
    </aside>
  );
};
