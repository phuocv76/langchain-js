// Internal
import { createContext, useContext } from 'react';

const ChatSessionContext = createContext({ isHistoricalThread: false });

interface ChatSessionProviderProps {
  readonly isHistoricalThread: boolean;
  readonly children: React.ReactNode;
}

/** Provides read-only state for historical CopilotKit threads. */
export const ChatSessionProvider = ({
  isHistoricalThread,
  children,
}: ChatSessionProviderProps): React.JSX.Element => (
  <ChatSessionContext.Provider value={{ isHistoricalThread }}>
    {children}
  </ChatSessionContext.Provider>
);

/** Returns whether the active thread is historical (read-only). */
export const useChatSession = (): { isHistoricalThread: boolean } =>
  useContext(ChatSessionContext);
