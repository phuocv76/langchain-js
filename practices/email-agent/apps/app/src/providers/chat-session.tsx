// Libs for third party
import { createContext, useContext, useMemo } from 'react';

export interface ChatSessionContextValue {
  /** True when viewing a saved thread from history (read-only). */
  readonly isHistoricalThread: boolean;
}

const ChatSessionContext = createContext<ChatSessionContextValue | null>(null);

/** Supplies read-only state for historical thread views. */
export const ChatSessionProvider = ({
  isHistoricalThread,
  children,
}: {
  readonly isHistoricalThread: boolean;
  readonly children: React.ReactNode;
}): React.JSX.Element => {
  const value = useMemo(
    (): ChatSessionContextValue => ({ isHistoricalThread }),
    [isHistoricalThread],
  );

  return (
    <ChatSessionContext.Provider value={value}>
      {children}
    </ChatSessionContext.Provider>
  );
};

/** Reads whether the active chat thread is a historical (read-only) view. */
export const useChatSession = (): ChatSessionContextValue => {
  const context = useContext(ChatSessionContext);

  if (!context) {
    throw new Error('useChatSession must be used within ChatSessionProvider');
  }

  return context;
};
