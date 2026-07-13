export interface HistoryThread {
  readonly thread_id: string;
  readonly title: string | null;
  readonly updated_at: string;
}

export interface HistoryTurn {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly created_at: string;
}

const getJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`History request failed (${response.status})`);
  return (await response.json()) as T;
};

export const getHistoryThreads = async (): Promise<readonly HistoryThread[]> =>
  (await getJson<{ threads: HistoryThread[] }>('/api/memory/threads')).threads;

export const getHistoryTurns = async (
  threadId: string,
): Promise<readonly HistoryTurn[]> =>
  (
    await getJson<{ turns: HistoryTurn[] }>(
      `/api/memory/threads/${encodeURIComponent(threadId)}/messages`,
    )
  ).turns.reverse();
