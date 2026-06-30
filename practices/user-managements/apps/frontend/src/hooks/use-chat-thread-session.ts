// Libs for third party
import { useAgent, useCopilotKit } from '@copilotkit/react-core/v2';
import { useCallback, useState } from 'react';

// Internal
import { AGENT_ID } from '@/lib/constants/messages';

export interface ChatThreadSession {
  readonly activeThreadId: string | undefined;
  readonly chatSessionKey: number;
  readonly isHistoricalThread: boolean;
  readonly startNewChat: () => void;
  readonly selectThread: (threadId: string) => void;
}

const isIntelligenceThreadsReady = (
  status: string,
  threadListEnabled: boolean | undefined,
): boolean => status === 'connected' && threadListEnabled !== false;

/** Manages active thread selection and chat remount keys. */
export const useChatThreadSession = (): ChatThreadSession => {
  const { agent } = useAgent({ agentId: AGENT_ID });
  const { copilotkit } = useCopilotKit();
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>();
  const [chatSessionKey, setChatSessionKey] = useState(0);
  const [isHistoricalThread, setIsHistoricalThread] = useState(false);

  const resetAgentChat = useCallback((): void => {
    try {
      copilotkit.stopAgent({ agent });
    } catch {
      // No active run.
    }
    void agent.detachActiveRun().catch(() => undefined);
    agent.setMessages([]);
    copilotkit.setInterruptElement(null);
  }, [agent, copilotkit]);

  const startNewChat = useCallback((): void => {
    resetAgentChat();
    const useCloud = isIntelligenceThreadsReady(
      copilotkit.runtimeConnectionStatus,
      copilotkit.threadEndpoints?.list,
    );
    setActiveThreadId(useCloud ? crypto.randomUUID() : undefined);
    setIsHistoricalThread(false);
    setChatSessionKey((k) => k + 1);
  }, [copilotkit, resetAgentChat]);

  const selectThread = useCallback(
    (threadId: string): void => {
      if (threadId === activeThreadId) return;
      resetAgentChat();
      setActiveThreadId(threadId);
      setIsHistoricalThread(true);
      setChatSessionKey((k) => k + 1);
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
