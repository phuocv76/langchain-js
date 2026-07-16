// Internal
import { AGENT_API_URL } from '@/lib/config';

/** One conversation in the durable transcript store (D1). */
export interface ThreadSummary {
  readonly thread_id: string;
  /** First user message of the thread; null before any user turn persisted. */
  readonly title: string | null;
  readonly updated_at: string;
}

const request = async <T>(
  idToken: string,
  path: string,
  init?: { method: 'PATCH' | 'DELETE'; body?: unknown },
): Promise<T> => {
  const response = await fetch(`${AGENT_API_URL}${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${idToken}`,
      ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  });
  if (!response.ok) {
    throw new Error(`Agent API ${path} returned ${response.status}`);
  }
  return (await response.json()) as T;
};

/** Lists the signed-in user's threads, newest first. */
export const fetchThreads = async (idToken: string): Promise<ThreadSummary[]> => {
  const { threads } = await request<{ threads: ThreadSummary[] }>(
    idToken,
    '/memory/threads',
  );
  return threads;
};

/** One chat message from the durable transcript store (D1). */
export interface HistoryMessage {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
}

/**
 * Loads a thread's full message history from the durable transcript. Used to
 * fill the live transcript instantly when the runtime's in-memory replay is
 * unavailable, and stays complete even after the engine has summarized old
 * messages away. Ids are the engine-assigned message ids recorded at write
 * time, so a later run's snapshot merges instead of duplicating.
 */
export const fetchHistoryMessages = async (
  idToken: string,
  threadId: string,
): Promise<HistoryMessage[]> => {
  const { messages } = await request<{ messages: HistoryMessage[] }>(
    idToken,
    `/memory/threads/${encodeURIComponent(threadId)}/history-messages`,
  );
  return messages;
};

/** Sets a user-defined title, overriding the derived first-message title. */
export const renameThread = async (
  idToken: string,
  threadId: string,
  title: string,
): Promise<void> => {
  await request(idToken, `/memory/threads/${encodeURIComponent(threadId)}`, {
    method: 'PATCH',
    body: { title },
  });
};

/** Deletes the thread's transcript (D1) and its LangGraph checkpoint. */
export const deleteThread = async (
  idToken: string,
  threadId: string,
): Promise<void> => {
  await request(idToken, `/memory/threads/${encodeURIComponent(threadId)}`, {
    method: 'DELETE',
  });
};
