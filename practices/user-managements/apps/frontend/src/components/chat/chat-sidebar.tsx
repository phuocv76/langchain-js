// Internal
import { ThreadHistory } from '@/components/chat/thread-history';
import { useClientMounted } from '@/hooks/use-client-mounted';

interface ChatSidebarProps {
  readonly activeThreadId: string | undefined;
  readonly onNewChat: () => void;
  readonly onSelectThread: (threadId: string) => void;
}

/** Sidebar with new chat and thread history. */
export const ChatSidebar = ({
  activeThreadId,
  onNewChat,
  onSelectThread,
}: ChatSidebarProps): React.JSX.Element => {
  const isMounted = useClientMounted();

  return (
    <aside className="chat-sidebar" aria-label="Conversation history">
      <div className="chat-sidebar__top">
        <button type="button" className="new-chat-button" onClick={onNewChat}>
          <span aria-hidden>+</span>
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
