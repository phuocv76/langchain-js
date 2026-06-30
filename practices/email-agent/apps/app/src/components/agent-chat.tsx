// Libs for third party
import { CopilotChat } from '@copilotkit/react-core/v2';
import { useMemo } from 'react';

// Internal
import { EmailAssistantMessage } from '@/components/email-assistant-message';
import { GuardrailAssistantMessage } from '@/components/guardrail-assistant-message';
import { InterruptAwareChatInput } from '@/components/interrupt-aware-chat-input';
import { NewsAssistantMessage } from '@/components/news-assistant-message';
import { ThreadTitleSync } from '@/components/thread-title-sync';
import { useThreadLockGrace } from '@/hooks/use-thread-lock-grace';
import { getAgent, type AgentId } from '@/lib/agents';
import { useChatSession } from '@/providers/chat-session';
import { useInterruptFeedbackBridge } from '@/providers/interrupt-feedback-bridge';

interface AgentChatProps {
  readonly agentId: AgentId;
  readonly sessionKey: string;
  readonly threadId: string | undefined;
}

const ASSISTANT_MESSAGE_BY_AGENT: Record<
  AgentId,
  typeof NewsAssistantMessage
> = {
  newsAgent: NewsAssistantMessage,
  emailAgent: EmailAssistantMessage,
  warrantyAgent: GuardrailAssistantMessage,
};

/**
 * CopilotKit chat surface parameterized by practice agent id.
 */
export const AgentChat = ({
  agentId,
  sessionKey,
  threadId,
}: AgentChatProps): React.JSX.Element => {
  const agentMeta = getAgent(agentId);
  const { isHistoricalThread } = useChatSession();
  const { effectiveIsRunning } = useThreadLockGrace(agentId);
  const { isActive: isInterruptActive, canAcceptChatFeedback } =
    useInterruptFeedbackBridge();

  const chatView = useMemo(
    () => ({
      isRunning: effectiveIsRunning,
      input: InterruptAwareChatInput,
      autoScroll: true as const,
    }),
    [effectiveIsRunning],
  );

  const chatInputPlaceholder = isHistoricalThread
    ? 'Read-only — start a new chat to continue'
    : isInterruptActive && canAcceptChatFeedback
      ? 'Describe how to change the draft…'
      : agentMeta.placeholder;

  const messageView = useMemo(
    () => ({ assistantMessage: ASSISTANT_MESSAGE_BY_AGENT[agentId] }),
    [agentId],
  );

  return (
    <>
      <ThreadTitleSync agentId={agentId} />
      <CopilotChat
        key={`${agentId}-${sessionKey}-${threadId ?? 'new'}`}
        agentId={agentId}
        threadId={threadId}
        chatView={chatView}
        messageView={messageView}
        labels={{
          welcomeMessageText: agentMeta.welcomeMessage,
          chatInputPlaceholder,
          modalHeaderTitle: agentMeta.label,
        }}
      />
    </>
  );
};
