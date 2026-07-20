import type { ThreadSummary } from '@/lib/agent-api';
import type { RealtimeEvent } from './events';

const sortByUpdatedAtDesc = (
  threads: readonly ThreadSummary[],
): ThreadSummary[] =>
  [...threads].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

/**
 * Pure reducer for thread-list mutations driven by realtime events.
 */
export const applyThreadEvent = (
  threads: readonly ThreadSummary[],
  event: RealtimeEvent,
): readonly ThreadSummary[] => {
  if (!event.threadId) return threads;

  switch (event.type) {
    case 'THREAD_DELETED':
      return threads.filter((thread) => thread.thread_id !== event.threadId);

    case 'THREAD_CREATED':
    case 'THREAD_UPDATED':
    case 'THREAD_RENAMED':
    case 'MESSAGE_CREATED': {
      const existing = threads.find((thread) => thread.thread_id === event.threadId);
      const nextTitle =
        event.type === 'THREAD_RENAMED'
          ? (event.title ?? existing?.title ?? null)
          : event.title !== undefined
            ? event.title
            : (existing?.title ?? null);
      const next: ThreadSummary = {
        thread_id: event.threadId,
        title: nextTitle,
        updated_at: event.updatedAt,
      };
      const without = threads.filter((thread) => thread.thread_id !== event.threadId);
      return sortByUpdatedAtDesc([next, ...without]);
    }

    default:
      return threads;
  }
};
