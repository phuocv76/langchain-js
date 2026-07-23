// Libs for third party
import type { Context } from 'hono';

// Internal
import type { AgentUserContext } from '@agent/middleware/agent-user-auth.js';
import {
  deleteCheckpointThread,
  deleteMemoryThread,
  listMemoryThread,
  listMemoryThreads,
  renameMemoryThread,
  type MemoryIdentity,
} from '@agent/services/memory-client.js';
import { nowIso, publishRealtimeEvent } from '@agent/services/realtime/index.js';

const identityFor = (context: Context, threadId: string): MemoryIdentity => {
  const user = context.get('agentUser') as AgentUserContext;
  return {
    requestId: user.requestId,
    userId: user.userId,
    threadId,
  };
};

export const listThreads = async (context: Context): Promise<Response> => {
  const user = context.get('agentUser') as AgentUserContext;
  const threads = await listMemoryThreads({
    requestId: user.requestId,
    userId: user.userId,
    threadId: '__thread-list__',
  });
  return context.json({ threads });
};

/**
 * Chat messages of a thread, read from the user-scoped D1 transcript.
 *
 * Powers instant history when the CopilotKit runtime's in-memory replay is
 * gone (process restart), and stays complete even after the engine compacts
 * old messages into a summary — the transcript is the full product ledger.
 * Each message carries the engine-assigned id recorded at write time, so a
 * later run's snapshot merges with the injected history instead of
 * duplicating it. Rows that predate message_id fall back to their row id.
 */
export const listThreadHistoryMessages = async (
  context: Context,
): Promise<Response> => {
  const threadId = context.req.param('threadId');
  if (!threadId) return context.json({ error: 'threadId is required' }, 400);

  const turns = await listMemoryThread(identityFor(context, threadId));
  const messages = [...turns]
    .reverse() // worker returns newest first; the transcript reads oldest first
    .filter((turn) => turn.role === 'user' || turn.role === 'assistant')
    .map((turn) => ({
      id: turn.message_id ?? turn.id,
      role: turn.role as 'user' | 'assistant',
      content: turn.content,
    }))
    .filter((message) => message.content);
  return context.json({ messages });
};

export const renameThread = async (context: Context): Promise<Response> => {
  const threadId = context.req.param('threadId');
  if (!threadId) return context.json({ error: 'threadId is required' }, 400);
  const body: unknown = await context.req.json().catch(() => undefined);
  const title =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).title
      : undefined;
  if (typeof title !== 'string' || !title.trim() || title.length > 200) {
    return context.json({ error: 'title must be a non-empty string (max 200 chars)' }, 400);
  }
  await renameMemoryThread(identityFor(context, threadId), title.trim());
  const user = context.get('agentUser') as AgentUserContext;
  await publishRealtimeEvent({
    userId: user.userId,
    event: {
      type: 'THREAD_RENAMED',
      threadId,
      title: title.trim(),
      updatedAt: nowIso(),
    },
  });
  return context.json({ ok: true });
};

export const deleteThread = async (context: Context): Promise<Response> => {
  const threadId = context.req.param('threadId');
  if (!threadId) return context.json({ error: 'threadId is required' }, 400);
  await deleteMemoryThread(identityFor(context, threadId));

  // Also drop the engine checkpoints so the conversation content is truly
  // gone, not just hidden from the sidebar. Best-effort: the thread may
  // predate checkpoint storage or already be deleted.
  try {
    await deleteCheckpointThread(identityFor(context, threadId));
  } catch (error) {
    console.warn(
      '[memory] checkpoint delete skipped:',
      error instanceof Error ? error.message : 'unknown error',
    );
  }

  const user = context.get('agentUser') as AgentUserContext;
  await publishRealtimeEvent({
    userId: user.userId,
    event: {
      type: 'THREAD_DELETED',
      threadId,
      updatedAt: nowIso(),
    },
  });
  return context.json({ ok: true });
};
