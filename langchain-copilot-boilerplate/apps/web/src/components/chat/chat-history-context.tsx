'use client';

// Libs for third party
import { useAgent } from '@copilotkit/react-core/v2';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

// Internal
import { AGENT_ID } from '@/lib/config';

/** LocalStorage key for the thread-id → display-title cache. */
const TITLES_KEY = 'copilot-thread-titles';
/** Max characters shown for an auto-derived conversation title. */
const TITLE_MAX_LENGTH = 48;

interface ChatHistoryValue {
  /** Thread id currently bound to the chat surface. */
  readonly activeThreadId: string;
  /**
   * When `true`, the chat connects to `activeThreadId` and loads its history
   * from the runtime. When `false` (a brand-new chat) the welcome screen shows.
   */
  readonly isExplicit: boolean;
  /** Whether the history sidebar is expanded. */
  readonly sidebarOpen: boolean;
  /** Bumped whenever an agent run finishes so the thread list can refetch. */
  readonly refreshKey: number;
  /** Start a fresh conversation (new thread id, empty transcript, welcome). */
  readonly newChat: () => void;
  /** Switch to an existing thread and load its history. */
  readonly selectThread: (id: string) => void;
  /** Show/hide the sidebar. */
  readonly toggleSidebar: () => void;
  /** Best-effort display title for a thread, derived from its first message. */
  readonly getTitle: (id: string) => string | undefined;
}

const ChatHistoryContext = createContext<ChatHistoryValue | null>(null);

/** Extracts a short, human-readable title from a message's text content. */
const deriveTitle = (content: unknown): string | null => {
  if (typeof content !== 'string') {
    return null;
  }
  const trimmed = content.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return null;
  }
  return trimmed.length > TITLE_MAX_LENGTH
    ? `${trimmed.slice(0, TITLE_MAX_LENGTH).trimEnd()}…`
    : trimmed;
};

const loadTitles = (): Record<string, string> => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(TITLES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
};

/**
 * Owns the chat-history state that the sidebar and chat surface share.
 *
 * Thread listing, persistence, and history loading are handled by CopilotKit's
 * Intelligence thread endpoints (see `useThreads`). Because the local dev
 * runtime does not name threads, we cache a display title per thread id in
 * `localStorage`, derived from each conversation's first user message.
 */
export const ChatHistoryProvider = ({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element => {
  const { agent } = useAgent({ agentId: AGENT_ID });
  const [activeThreadId, setActiveThreadId] = useState<string>(() =>
    crypto.randomUUID(),
  );
  const [isExplicit, setIsExplicit] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [titles, setTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    setTitles(loadTitles());
  }, []);

  // Capture a title for the active thread from its first user message.
  const messages = agent.messages ?? [];
  const firstUserContent = messages.find((m) => m.role === 'user')?.content;
  useEffect(() => {
    const title = deriveTitle(firstUserContent);
    if (!title) {
      return;
    }
    setTitles((prev) => {
      // Titles are immutable once captured from the first user message. This
      // also avoids mislabeling during a thread switch, when the transcript is
      // momentarily the previous conversation's messages.
      if (prev[activeThreadId]) {
        return prev;
      }
      const next = { ...prev, [activeThreadId]: title };
      try {
        window.localStorage.setItem(TITLES_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota / serialization errors */
      }
      return next;
    });
  }, [firstUserContent, activeThreadId]);

  // Refresh the thread list when a run finishes (no realtime locally).
  const wasRunning = useRef(false);
  const isRunning = agent.isRunning;
  useEffect(() => {
    if (wasRunning.current && !isRunning) {
      setRefreshKey((k) => k + 1);
    }
    wasRunning.current = isRunning;
  }, [isRunning]);

  const newChat = useCallback(() => {
    agent.setMessages([]);
    setActiveThreadId(crypto.randomUUID());
    setIsExplicit(false);
  }, [agent]);

  const selectThread = useCallback(
    (id: string) => {
      if (id === activeThreadId) {
        return;
      }
      // Clear the transcript so the outgoing conversation doesn't flash (or
      // get captured as this thread's title) before its history loads.
      agent.setMessages([]);
      setActiveThreadId(id);
      setIsExplicit(true);
    },
    [agent, activeThreadId],
  );

  const toggleSidebar = useCallback(() => setSidebarOpen((o) => !o), []);

  const getTitle = useCallback((id: string) => titles[id], [titles]);

  const value = useMemo<ChatHistoryValue>(
    () => ({
      activeThreadId,
      isExplicit,
      sidebarOpen,
      refreshKey,
      newChat,
      selectThread,
      toggleSidebar,
      getTitle,
    }),
    [
      activeThreadId,
      isExplicit,
      sidebarOpen,
      refreshKey,
      newChat,
      selectThread,
      toggleSidebar,
      getTitle,
    ],
  );

  return (
    <ChatHistoryContext.Provider value={value}>
      {children}
    </ChatHistoryContext.Provider>
  );
};

/** Access the shared chat-history state. Must be used within the provider. */
export const useChatHistory = (): ChatHistoryValue => {
  const ctx = useContext(ChatHistoryContext);
  if (!ctx) {
    throw new Error('useChatHistory must be used within a ChatHistoryProvider');
  }
  return ctx;
};
