// Libs for third party
import { useCopilotKit, useThreads } from "@copilotkit/react-core/v2";

// Internal
import { formatThreadError } from "@/lib/threads/errors";
import { formatThreadDisplayName } from "@/lib/threads/title";
import type { AgentId } from "@/lib/agents";

interface ThreadHistoryProps {
  readonly agentId: AgentId;
  readonly activeThreadId: string | undefined;
  readonly onSelectThread: (threadId: string) => void;
}

/** Thread list backed by CopilotKit Intelligence — client-only. */
export const ThreadHistory = ({
  agentId,
  activeThreadId,
  onSelectThread,
}: ThreadHistoryProps): React.JSX.Element => {
  const { copilotkit } = useCopilotKit();
  const { threads, isLoading, error } = useThreads({ agentId });

  const runtimeReady =
    copilotkit.runtimeConnectionStatus === "connected" &&
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
        {threads.map((thread) => {
          const isActive = thread.id === activeThreadId;

          return (
            <li key={thread.id}>
              <button
                type="button"
                className={`thread-item${isActive ? " thread-item--active" : ""}`}
                onClick={() => onSelectThread(thread.id)}
                title={formatThreadDisplayName(thread.name)}
              >
                <span className="thread-item__label">
                  {formatThreadDisplayName(thread.name)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
};
