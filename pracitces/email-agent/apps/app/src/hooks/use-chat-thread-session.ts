import { useCallback, useState } from "react";

export interface ChatThreadSession {
  readonly activeThreadId: string | undefined;
  readonly chatSessionKey: number;
  readonly startNewChat: () => void;
  readonly selectThread: (threadId: string) => void;
}

/** Manages active thread selection and chat remount keys for CopilotKit. */
export const useChatThreadSession = (): ChatThreadSession => {
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(
    undefined,
  );
  const [chatSessionKey, setChatSessionKey] = useState(0);

  const startNewChat = useCallback((): void => {
    setActiveThreadId(undefined);
    setChatSessionKey((key) => key + 1);
  }, []);

  const selectThread = useCallback((threadId: string): void => {
    setActiveThreadId(threadId);
  }, []);

  return {
    activeThreadId,
    chatSessionKey,
    startNewChat,
    selectThread,
  };
};
