// Libs for third party
import { useAgent, useCopilotKit } from '@copilotkit/react-core/v2';
import { useCallback, useState } from 'react';

// Internal
import type { AgentId } from '@/lib/agents';

export interface ChatThreadSession {
  readonly activeThreadId: string | undefined;
  readonly chatSessionKey: number;
  readonly isHistoricalThread: boolean;
  readonly startNewChat: () => void;
  readonly selectThread: (threadId: string) => void;
}

/** Returns true when CopilotKit Intelligence thread APIs are available. */
const isIntelligenceThreadsReady = (
  runtimeConnectionStatus: string,
  threadListEnabled: boolean | undefined,
): boolean =>
  runtimeConnectionStatus === 'connected' && threadListEnabled !== false;

/**
 * Manages active thread selection and chat remount keys for CopilotKit.
 *
 * @param agentId - CopilotKit agent id backing the chat surface.
 */
export const useChatThreadSession = (agentId: AgentId): ChatThreadSession => {
  const { agent } = useAgent({ agentId });
  const { copilotkit } = useCopilotKit();
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(
    undefined,
  );
  const [chatSessionKey, setChatSessionKey] = useState(0);
  const [isHistoricalThread, setIsHistoricalThread] = useState(false);

  const resetAgentChat = useCallback((): void => {
    try {
      copilotkit.stopAgent({ agent });
    } catch {
      // No active run to stop.
    }

    void agent.detachActiveRun().catch(() => {
      // Agent may already be idle between turns.
    });

    agent.setMessages([]);
    copilotkit.setInterruptElement(null);
  }, [agent, copilotkit]);

  const startNewChat = useCallback((): void => {
    resetAgentChat();

    const useCloudThread = isIntelligenceThreadsReady(
      copilotkit.runtimeConnectionStatus,
      copilotkit.threadEndpoints?.list,
    );

    setActiveThreadId(useCloudThread ? crypto.randomUUID() : undefined);
    setIsHistoricalThread(false);
    setChatSessionKey((key) => key + 1);
  }, [copilotkit, resetAgentChat]);

  const selectThread = useCallback(
    (threadId: string): void => {
      if (threadId === activeThreadId) {
        return;
      }

      resetAgentChat();
      setActiveThreadId(threadId);
      setIsHistoricalThread(true);
      setChatSessionKey((key) => key + 1);
    },
    [activeThreadId, resetAgentChat],
  );

  return {
    activeThreadId,
    chatSessionKey,
    isHistoricalThread,
    startNewChat,
    selectThread,
  };
};
