// Internal
import { AgentChat } from '@/components/agent-chat';
import { ChatSidebar } from '@/components/chat-sidebar';
import { EmailReviewInterrupt } from '@/components/email-review-interrupt';
import { WarrantyReviewInterrupt } from '@/components/warranty-review-interrupt';
import { useChatThreadSession } from '@/hooks/use-chat-thread-session';
import { getAgent, type AgentId } from '@/lib/agents';
import { ChatSessionProvider } from '@/providers/chat-session';
import { InterruptFeedbackBridgeProvider } from '@/providers/interrupt-feedback-bridge';

interface AgentPageProps {
  readonly agentId: AgentId;
}

/** Chat shell with history sidebar and agent-specific interrupts. */
export const AgentPage = ({
  agentId,
}: AgentPageProps): React.JSX.Element => {
  const { activeThreadId, chatSessionKey, isHistoricalThread, startNewChat, selectThread } =
    useChatThreadSession(agentId);
  const agentMeta = getAgent(agentId);

  return (
    <div className="app-shell">
      <ChatSidebar
        agentId={agentId}
        activeThreadId={activeThreadId}
        onNewChat={startNewChat}
        onSelectThread={selectThread}
      />

      <main className="chat-main">
        <header className="chat-main__header">
          <div>
            <h1>{agentMeta.label}</h1>
            <p className="chat-main__subtitle">{agentMeta.description}</p>
          </div>
        </header>

        <div className="chat-main__surface">
          <ChatSessionProvider isHistoricalThread={isHistoricalThread}>
            <InterruptFeedbackBridgeProvider key={chatSessionKey}>
            <AgentChat
              agentId={agentId}
              sessionKey={String(chatSessionKey)}
              threadId={activeThreadId}
            />

            {agentId === 'emailAgent' ? <EmailReviewInterrupt /> : null}
            {agentId === 'warrantyAgent' ? <WarrantyReviewInterrupt /> : null}
            </InterruptFeedbackBridgeProvider>
          </ChatSessionProvider>
        </div>
      </main>
    </div>
  );
};
