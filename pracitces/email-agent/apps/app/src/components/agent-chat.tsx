// Libs for third party
import { CopilotChat } from "@copilotkit/react-core/v2";
import { useMemo } from "react";

// Internal
import { GuardrailAssistantMessage } from "@/components/guardrail-assistant-message";
import { NewsAssistantMessage } from "@/components/news-assistant-message";
import { ThreadTitleSync } from "@/components/thread-title-sync";
import { useThreadLockGrace } from "@/hooks/use-thread-lock-grace";
import { getAgent, type AgentId } from "@/lib/agents";

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
  emailAgent: GuardrailAssistantMessage,
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
  const { effectiveIsRunning } = useThreadLockGrace(agentId);

  const chatView = useMemo(
    () => ({ isRunning: effectiveIsRunning }),
    [effectiveIsRunning],
  );

  const messageView = useMemo(
    () => ({ assistantMessage: ASSISTANT_MESSAGE_BY_AGENT[agentId] }),
    [agentId],
  );

  return (
    <>
      <ThreadTitleSync agentId={agentId} />
      <CopilotChat
        key={`${agentId}-${sessionKey}-${threadId ?? "new"}`}
        agentId={agentId}
        threadId={threadId}
        chatView={chatView}
        messageView={messageView}
        labels={{
          welcomeMessageText: agentMeta.welcomeMessage,
          chatInputPlaceholder: agentMeta.placeholder,
          modalHeaderTitle: agentMeta.label,
        }}
      />
    </>
  );
};
