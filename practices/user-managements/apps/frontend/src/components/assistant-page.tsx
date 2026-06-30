// Internal
import { ChatSidebar } from '@/components/chat-sidebar';
import { UserManagementChat } from '@/components/user-management-chat';
import { UserMutationReviewInterrupt } from '@/components/user-mutation-review-interrupt';
import { MESSAGES } from '@/lib/constants/messages';
import { useChatThreadSession } from '@/hooks/use-chat-thread-session';
import { ChatSessionProvider } from '@/providers/chat-session';

/** Assistant view with thread sidebar and CopilotKit chat. */
export const AssistantPage = (): React.JSX.Element => {
  const {
    activeThreadId,
    chatSessionKey,
    isHistoricalThread,
    startNewChat,
    selectThread,
  } = useChatThreadSession();

  return (
    <div className="app-shell">
      <ChatSidebar
        activeThreadId={activeThreadId}
        onNewChat={startNewChat}
        onSelectThread={selectThread}
      />
      <main className="chat-main">
        <header className="chat-main__header">
          <div>
            <h1>{MESSAGES.NAV_ASSISTANT}</h1>
            <p className="chat-main__subtitle">
              LangChain agent with human-in-the-loop mutations
            </p>
          </div>
        </header>
        <div className="chat-main__surface">
          <ChatSessionProvider isHistoricalThread={isHistoricalThread}>
            <UserMutationReviewInterrupt />
            <UserManagementChat
              sessionKey={chatSessionKey}
              threadId={activeThreadId}
            />
          </ChatSessionProvider>
        </div>
      </main>
    </div>
  );
};
