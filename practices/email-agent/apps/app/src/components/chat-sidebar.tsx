// Internal
import { ComposeIcon } from "@/components/icons/compose-icon";
import { ThreadHistory } from "@/components/thread-history";
import { useClientMounted } from "@/hooks/use-client-mounted";
import type { AgentId } from "@/lib/agents";

interface ChatSidebarProps {
  readonly agentId: AgentId;
  readonly activeThreadId: string | undefined;
  readonly onNewChat: () => void;
  readonly onSelectThread: (threadId: string) => void;
}

/** ChatGPT-style sidebar with new chat and Intelligence-backed thread history. */
export const ChatSidebar = ({
  agentId,
  activeThreadId,
  onNewChat,
  onSelectThread,
}: ChatSidebarProps): React.JSX.Element => {
  const isMounted = useClientMounted();

  return (
    <aside className="chat-sidebar" aria-label="Conversation history">
      <div className="chat-sidebar__top">
        <button type="button" className="new-chat-button" onClick={onNewChat}>
          <ComposeIcon />
          <span>New chat</span>
        </button>
      </div>

      <div className="chat-sidebar__history">
        <p className="chat-sidebar__section-label">Recent</p>
        {isMounted ? (
          <ThreadHistory
            agentId={agentId}
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
