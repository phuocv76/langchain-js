// Libs for third party
import { useCallback, useState } from 'react';

// Internal
import { useThreadList } from '@/components/history/thread-list-context';

const formatUpdatedAt = (value: string): string => {
  // D1 timestamps are UTC without a zone suffix; normalize before parsing.
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Conversation history from the durable transcript store (D1), scoped
 * server-side to the signed-in user. List state lives in ThreadListProvider
 * so realtime events can update every open session.
 */
export const ThreadSidebar = ({
  activeThreadId,
  onSelectThread,
  onNewThread,
}: {
  readonly activeThreadId: string;
  readonly onSelectThread: (threadId: string) => void;
  readonly onNewThread: () => void;
}): React.JSX.Element => {
  const { threads, isLoading, error, renameThread, deleteThread } = useThreadList();

  // Inline flows instead of window.prompt/confirm: native dialogs block the
  // page and cannot be styled or dismissed programmatically.
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [confirmingThreadId, setConfirmingThreadId] = useState<string | null>(null);

  const submitRename = useCallback(
    (threadId: string): void => {
      const title = draftTitle.trim();
      setEditingThreadId(null);
      if (!title) return;
      void renameThread(threadId, title);
    },
    [draftTitle, renameThread],
  );

  const submitDelete = useCallback(
    (threadId: string): void => {
      setConfirmingThreadId(null);
      void deleteThread(threadId).then(() => {
        // Leaving the user inside a deleted conversation would be confusing.
        if (threadId === activeThreadId) onNewThread();
      });
    },
    [deleteThread, activeThreadId, onNewThread],
  );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-background">
      <div className="border-b border-border p-3">
        <button
          type="button"
          onClick={onNewThread}
          className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          + New chat
        </button>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">Loading…</p>
        )}
        {error && <p className="px-2 py-1.5 text-sm text-destructive">{error}</p>}
        {!isLoading && !error && threads.length === 0 && (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">
            No conversations yet.
          </p>
        )}
        <ul className="space-y-1">
          {threads.map((thread) => {
            const isActive = thread.thread_id === activeThreadId;
            const isEditing = editingThreadId === thread.thread_id;
            const isConfirming = confirmingThreadId === thread.thread_id;

            if (isEditing) {
              return (
                <li key={thread.thread_id}>
                  <input
                    autoFocus
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    onBlur={() => setEditingThreadId(null)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submitRename(thread.thread_id);
                      if (event.key === 'Escape') setEditingThreadId(null);
                    }}
                    aria-label="Conversation title"
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none"
                  />
                </li>
              );
            }

            return (
              <li key={thread.thread_id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelectThread(thread.thread_id)}
                  className={`w-full rounded-lg px-2 py-1.5 text-left transition-colors ${
                    isActive ? 'bg-muted' : 'hover:bg-muted/60'
                  }`}
                >
                  <span className="block truncate pr-12 text-sm text-foreground">
                    {thread.title ?? 'Untitled conversation'}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatUpdatedAt(thread.updated_at)}
                  </span>
                </button>
                <span
                  className={`absolute right-1 top-1.5 gap-0.5 ${
                    isActive ? 'flex' : 'hidden group-hover:flex'
                  }`}
                >
                  <button
                    type="button"
                    aria-label="Rename conversation"
                    title="Rename"
                    onClick={() => {
                      setConfirmingThreadId(null);
                      setDraftTitle(thread.title ?? '');
                      setEditingThreadId(thread.thread_id);
                    }}
                    className="rounded px-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    aria-label={isConfirming ? 'Confirm delete' : 'Delete conversation'}
                    title={isConfirming ? 'Click again to delete' : 'Delete'}
                    onClick={() =>
                      isConfirming
                        ? submitDelete(thread.thread_id)
                        : setConfirmingThreadId(thread.thread_id)
                    }
                    onBlur={() => setConfirmingThreadId(null)}
                    className={`rounded px-1 text-xs ${
                      isConfirming
                        ? 'bg-destructive/10 font-semibold text-destructive'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {isConfirming ? 'Sure?' : '🗑'}
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
