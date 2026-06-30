// Libs for third party
import { useCopilotKit, useThreads } from '@copilotkit/react-core/v2';

// Internal
import { AGENT_ID } from '@/lib/constants/messages';
import { formatThreadError } from '@/lib/threads/errors';
import { formatThreadDisplayName } from '@/lib/threads/title';

interface ThreadHistoryProps {
  readonly activeThreadId: string | undefined;
  readonly onSelectThread: (threadId: string) => void;
}

/** Thread list backed by CopilotKit (Intelligence when configured). */
export const ThreadHistory = ({
  activeThreadId,
  onSelectThread,
}: ThreadHistoryProps): React.JSX.Element => {
  const { copilotkit } = useCopilotKit();
  const { threads, isLoading, error } = useThreads({ agentId: AGENT_ID });

  const runtimeReady =
    copilotkit.runtimeConnectionStatus === 'connected' &&
    copilotkit.threadEndpoints?.list !== false;

  if (!runtimeReady && !error) {
    return <p className="chat-sidebar__hint">Loading conversations…</p>;
  }

  return (
    <>
      {isLoading ? (
        <p className="chat-sidebar__hint">Loading conversations…</p>
      ) : null}
      {error ? (
        <p className="chat-sidebar__hint chat-sidebar__hint--warn">
          {formatThreadError(error.message, copilotkit.runtimeMode)}
        </p>
      ) : null}
      {!isLoading && !error && threads.length === 0 ? (
        <p className="chat-sidebar__hint">No conversations yet.</p>
      ) : null}
      <ul className="thread-list">
        {threads.map((thread) => (
          <li key={thread.id}>
            <button
              type="button"
              className={`thread-item${thread.id === activeThreadId ? ' thread-item--active' : ''}`}
              onClick={() => onSelectThread(thread.id)}
              title={formatThreadDisplayName(thread.name)}
            >
              <span className="thread-item__label">
                {formatThreadDisplayName(thread.name)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
};
