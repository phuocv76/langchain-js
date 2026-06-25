// Libs for third party
import {
  useCopilotChatConfiguration,
  useCopilotKit,
} from "@copilotkit/react-core/v2";

// Internal
import { resolveAssistantText } from "@/lib/messages/assistant-text";
import { stringifyMessageContent } from "@/lib/threads/title";

interface AssistantMessageLike {
  readonly id: string;
  readonly content?: unknown;
}

export interface ResolvedAssistantMessage {
  readonly content: string;
  readonly stateSnapshot: unknown;
  readonly messageId: string;
}

/**
 * Resolves assistant text and run state for custom message renderers.
 *
 * @param message - CopilotKit assistant message from slot props.
 */
export const useResolvedAssistantMessage = (
  message: AssistantMessageLike,
): ResolvedAssistantMessage => {
  const { copilotkit } = useCopilotKit();
  const config = useCopilotChatConfiguration();
  const rawContent = message.content;

  const resolvedRunId =
    config &&
    (copilotkit.getRunIdForMessage(
      config.agentId,
      config.threadId,
      message.id,
    ) ??
      (stringifyMessageContent(rawContent) === ""
        ? copilotkit.getRunIdsForThread(config.agentId, config.threadId).at(-1)
        : undefined));

  const stateSnapshot =
    config && resolvedRunId
      ? copilotkit.getStateByRun(config.agentId, config.threadId, resolvedRunId)
      : undefined;

  return {
    content: resolveAssistantText(rawContent, stateSnapshot),
    stateSnapshot,
    messageId: message.id,
  };
};
