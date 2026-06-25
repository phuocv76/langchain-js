// Libs for third party
import {
  useAgent,
  useThreads,
  UseAgentUpdate,
} from "@copilotkit/react-core/v2";
import { useEffect, useRef } from "react";

// Internal
import {
  formatThreadTitleFromMessage,
  isPlaceholderThreadName,
} from "@/lib/threads/title";

/**
 * Renames Intelligence threads from the first user message instead of "Untitled".
 *
 * @param agentId - CopilotKit agent id backing the chat surface.
 */
export const useThreadTitleFromFirstMessage = (agentId: string): void => {
  const { agent } = useAgent({
    agentId,
    updates: [UseAgentUpdate.OnMessagesChanged],
  });
  const { threads, renameThread } = useThreads({ agentId });
  const renamedThreadIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const threadId = agent.threadId;
    if (!threadId || renamedThreadIdsRef.current.has(threadId)) {
      return;
    }

    const thread = threads.find((entry) => entry.id === threadId);
    if (thread && !isPlaceholderThreadName(thread.name)) {
      renamedThreadIdsRef.current.add(threadId);
      return;
    }

    const firstUserMessage = agent.messages.find(
      (message) => message.role === "user",
    );
    if (!firstUserMessage) {
      return;
    }

    const title = formatThreadTitleFromMessage(firstUserMessage.content);
    if (!title) {
      return;
    }

    renamedThreadIdsRef.current.add(threadId);
    void renameThread(threadId, title).catch(() => {
      renamedThreadIdsRef.current.delete(threadId);
    });
  }, [agent.messages, agent.threadId, renameThread, threads]);
};
