'use client';

// Libs for third party
import { useCopilotKit, useThreads } from '@copilotkit/react-core/v2';
import { useEffect, useState } from 'react';

const AGENT_ID = 'emailAgent';

interface ChatSidebarProps {
  activeThreadId: string | undefined;
  onNewChat: () => void;
  onSelectThread: (threadId: string) => void;
}

/** ChatGPT-style sidebar with new chat and Intelligence-backed thread history. */
export const ChatSidebar = ({
  activeThreadId,
  onNewChat,
  onSelectThread,
}: ChatSidebarProps): React.JSX.Element => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <aside className="chat-sidebar" aria-label="Conversation history">
      <div className="chat-sidebar__top">
        <button
          type="button"
          className="new-chat-button"
          onClick={onNewChat}
        >
          <ComposeIcon />
          <span>New chat</span>
        </button>
      </div>

      <div className="chat-sidebar__history">
        <p className="chat-sidebar__section-label">Recent</p>
        {isMounted ? (
          <ThreadHistory
            activeThreadId={activeThreadId}
            onSelectThread={onSelectThread}
          />
        ) : (
          <p className="chat-sidebar__hint">Loading conversations…</p>
        )}
      </div>
    </aside>
  );
};

interface ThreadHistoryProps {
  activeThreadId: string | undefined;
  onSelectThread: (threadId: string) => void;
}

/** Thread list backed by CopilotKit Intelligence — client-only. */
const ThreadHistory = ({
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
        {threads.map((thread) => {
          const isActive = thread.id === activeThreadId;

          return (
            <li key={thread.id}>
              <button
                type="button"
                className={`thread-item${isActive ? ' thread-item--active' : ''}`}
                onClick={() => onSelectThread(thread.id)}
                title={thread.name ?? 'New conversation'}
              >
                <span className="thread-item__label">
                  {thread.name ?? 'New conversation'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
};

/** Maps useThreads errors to a short, actionable sidebar hint. */
const formatThreadError = (message: string, runtimeMode?: string): string => {
  if (message.includes('Thread endpoints are not available')) {
    if (runtimeMode !== 'intelligence') {
      return (
        'Session-only chat history (no cloud save). To persist conversations, run ' +
        '`npx copilotkit@latest project select` and add the INTELLIGENCE_* vars to .env.'
      );
    }

    return 'Chat history is unavailable. Try a hard refresh (Cmd+Shift+R).';
  }

  if (message.includes('Failed to list threads')) {
    return (
      'Could not load saved conversations. Run `npx copilotkit@latest project select` ' +
      'in the repo root, add the INTELLIGENCE_API_URL, INTELLIGENCE_GATEWAY_WS_URL, ' +
      'and INTELLIGENCE_API_KEY values it writes to .env, then restart pnpm dev.'
    );
  }

  return message;
};

/** Simple compose icon for the new-chat button. */
const ComposeIcon = (): React.JSX.Element => (
  <svg
    aria-hidden="true"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
);
