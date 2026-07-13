// Libs for third party
import type { Context } from 'hono';

// Internal
import type { AgentUserContext } from '@agent/middleware/agent-user-auth.js';
import {
  listMemoryThread,
  listMemoryThreads,
  type MemoryIdentity,
} from '@agent/services/memory-client.js';

const identityFor = (context: Context, threadId: string): MemoryIdentity => {
  const user = context.get('agentUser') as AgentUserContext;
  return {
    requestId: user.requestId,
    userId: user.userId,
    tenantId: user.tenantId,
    threadId,
  };
};

export const listThreads = async (context: Context): Promise<Response> => {
  const user = context.get('agentUser') as AgentUserContext;
  const threads = await listMemoryThreads({
    requestId: user.requestId,
    userId: user.userId,
    tenantId: user.tenantId,
    threadId: '__thread-list__',
  });
  return context.json({ threads });
};

export const listThreadMessages = async (context: Context): Promise<Response> => {
  const threadId = context.req.param('threadId');
  if (!threadId) return context.json({ error: 'threadId is required' }, 400);
  return context.json({ turns: await listMemoryThread(identityFor(context, threadId)) });
};
