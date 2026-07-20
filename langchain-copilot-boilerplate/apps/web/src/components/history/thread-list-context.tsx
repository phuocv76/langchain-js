import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/components/auth/auth-provider';
import {
  deleteThread as deleteThreadApi,
  fetchThreads,
  renameThread as renameThreadApi,
  type ThreadSummary,
} from '@/lib/agent-api';
import { applyThreadEvent, type RealtimeEvent } from '@/services/websocket/client';

type ThreadListContextValue = {
  readonly threads: readonly ThreadSummary[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly reload: () => void;
  readonly applyRealtimeEvent: (event: RealtimeEvent) => void;
  readonly renameThread: (threadId: string, title: string) => Promise<void>;
  readonly deleteThread: (threadId: string) => Promise<void>;
};

const ThreadListContext = createContext<ThreadListContextValue | null>(null);

export const ThreadListProvider = ({
  children,
  activeThreadId,
}: {
  readonly children: React.ReactNode;
  readonly activeThreadId: string;
}): React.JSX.Element => {
  const { idToken } = useAuth();
  const [threads, setThreads] = useState<readonly ThreadSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback((): void => {
    if (!idToken) return;
    fetchThreads(idToken)
      .then((next) => {
        setThreads(next);
        setError(null);
      })
      .catch(() => setError('Could not load history.'))
      .finally(() => setIsLoading(false));
  }, [idToken]);

  useEffect(reload, [reload, activeThreadId]);

  const applyRealtimeEvent = useCallback((event: RealtimeEvent): void => {
    setThreads((prev) => applyThreadEvent(prev, event));
  }, []);

  const renameThread = useCallback(
    async (threadId: string, title: string): Promise<void> => {
      if (!idToken) return;
      try {
        await renameThreadApi(idToken, threadId, title);
        reload();
      } catch {
        setError('Rename failed.');
      }
    },
    [idToken, reload],
  );

  const deleteThread = useCallback(
    async (threadId: string): Promise<void> => {
      if (!idToken) return;
      try {
        await deleteThreadApi(idToken, threadId);
        reload();
      } catch {
        setError('Delete failed.');
      }
    },
    [idToken, reload],
  );

  const value = useMemo(
    (): ThreadListContextValue => ({
      threads,
      isLoading,
      error,
      reload,
      applyRealtimeEvent,
      renameThread,
      deleteThread,
    }),
    [
      threads,
      isLoading,
      error,
      reload,
      applyRealtimeEvent,
      renameThread,
      deleteThread,
    ],
  );

  return (
    <ThreadListContext.Provider value={value}>{children}</ThreadListContext.Provider>
  );
};

export const useThreadList = (): ThreadListContextValue => {
  const value = useContext(ThreadListContext);
  if (!value) {
    throw new Error('useThreadList must be used within ThreadListProvider');
  }
  return value;
};
