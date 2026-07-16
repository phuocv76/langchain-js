'use client';

// Libs for third party
import { CopilotChat } from '@copilotkit/react-core/v2';
import { useCallback, useState } from 'react';

// Internal
import { useAuth } from '@/components/auth/auth-provider';
import { ThreadHydrator } from '@/components/history/thread-hydrator';
import { ThreadSidebar } from '@/components/history/thread-sidebar';
import { PreviewPanel } from '@/components/preview/preview-panel';
import { WorkspaceToolRenderers } from '@/components/preview/workspace-tool-renderers';
import { AGENT_ID } from '@/lib/config';

/** Full-window chat surface: history sidebar, chat, and result preview panel. */
export const ChatView = (): React.JSX.Element => {
  const { user, logout } = useAuth();
  const [threadId, setThreadId] = useState<string>(() => crypto.randomUUID());

  const startNewThread = useCallback((): void => {
    setThreadId(crypto.randomUUID());
  }, []);

  return (
    <div className="flex h-dvh flex-col bg-background">
      <WorkspaceToolRenderers />
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-semibold text-foreground">
          AI Assistant
        </span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{user?.email}</span>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          >
            Sign out
          </button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <ThreadSidebar
          activeThreadId={threadId}
          onSelectThread={setThreadId}
          onNewThread={startNewThread}
        />
        <main className="flex min-h-0 min-w-0 flex-1 flex-col">
          <ThreadHydrator key={`hydrate-${threadId}`} threadId={threadId} />
          <div className="mx-auto min-h-0 w-full max-w-3xl flex-1 px-4 py-4">
            <CopilotChat
              key={threadId}
              agentId={AGENT_ID}
              threadId={threadId}
              className="h-full"
              labels={{ chatInputPlaceholder: 'Send a message…' }}
              input={{ showDisclaimer: false, autoFocus: true }}
            />
          </div>
        </main>
        <PreviewPanel />
      </div>
    </div>
  );
};
