export interface MemoryBindings {
  readonly MEMORY_DB: D1Database;
}

type Identity = {
  readonly tenantId: string;
  readonly userId: string;
  readonly threadId: string;
  readonly requestId: string;
};

type MemoryTurn = Identity & {
  readonly role: 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly toolMetadata?: unknown;
};

const json = (value: unknown, status = 200): Response =>
  Response.json(value, { status });

const isString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const parseIdentity = (value: unknown): Identity | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    !isString(candidate.tenantId) ||
    !isString(candidate.userId) ||
    !isString(candidate.threadId) ||
    !isString(candidate.requestId)
  ) {
    return undefined;
  }
  return {
    tenantId: candidate.tenantId,
    userId: candidate.userId,
    threadId: candidate.threadId,
    requestId: candidate.requestId,
  };
};

const appendTurn = async (
  request: Request,
  bindings: MemoryBindings,
): Promise<Response> => {
  const body: unknown = await request.json().catch(() => undefined);
  const identity = parseIdentity(body);
  const candidate = body as Partial<MemoryTurn> | undefined;
  if (
    !identity ||
    !candidate ||
    !['user', 'assistant', 'tool'].includes(candidate.role ?? '') ||
    !isString(candidate.content)
  ) {
    return json({ error: 'Invalid memory turn payload' }, 400);
  }

  const turnId = crypto.randomUUID();
  await bindings.MEMORY_DB.prepare(
    `INSERT INTO memory_turns
      (id, tenant_id, user_id, thread_id, request_id, role, content, tool_metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      turnId,
      identity.tenantId,
      identity.userId,
      identity.threadId,
      identity.requestId,
      candidate.role,
      candidate.content,
      candidate.toolMetadata === undefined
        ? null
        : JSON.stringify(candidate.toolMetadata),
    )
    .run();
  return json({ id: turnId }, 201);
};

const retrieve = async (request: Request, bindings: MemoryBindings): Promise<Response> => {
  const body: unknown = await request.json().catch(() => undefined);
  const identity = parseIdentity(body);
  const query = body && typeof body === 'object' ? (body as Record<string, unknown>).query : undefined;
  if (!identity || !isString(query)) return json({ error: 'Invalid memory retrieval payload' }, 400);

  const recentTurns = await bindings.MEMORY_DB.prepare(
    `SELECT id, thread_id, role, content, created_at FROM memory_turns
     WHERE tenant_id = ? AND user_id = ? AND thread_id = ? ORDER BY created_at DESC LIMIT 8`,
  ).bind(identity.tenantId, identity.userId, identity.threadId).all();
  return json({ semanticTurns: [], recentTurns: recentTurns.results });
};

const listTurns = async (request: Request, bindings: MemoryBindings): Promise<Response> => {
  const identity = parseIdentity(await request.json().catch(() => undefined));
  if (!identity) return json({ error: 'Invalid list payload' }, 400);
  const turns = await bindings.MEMORY_DB.prepare(
    `SELECT id, thread_id, role, content, created_at FROM memory_turns
     WHERE tenant_id = ? AND user_id = ? AND thread_id = ? ORDER BY created_at DESC LIMIT 100`,
  ).bind(identity.tenantId, identity.userId, identity.threadId).all();
  return json({ turns: turns.results });
};

const listThreads = async (request: Request, bindings: MemoryBindings): Promise<Response> => {
  const identity = parseIdentity(await request.json().catch(() => undefined));
  if (!identity) return json({ error: 'Invalid thread list payload' }, 400);
  const threads = await bindings.MEMORY_DB.prepare(
    `SELECT thread_id, MIN(CASE WHEN role = 'user' THEN content END) AS title, MAX(created_at) AS updated_at
     FROM memory_turns WHERE tenant_id = ? AND user_id = ? GROUP BY thread_id ORDER BY updated_at DESC LIMIT 100`,
  ).bind(identity.tenantId, identity.userId).all();
  return json({ threads: threads.results });
};

const deleteScope = async (request: Request, bindings: MemoryBindings, threadOnly: boolean): Promise<Response> => {
  const identity = parseIdentity(await request.json().catch(() => undefined));
  if (!identity) return json({ error: 'Invalid deletion payload' }, 400);
  const clause = threadOnly ? ' AND thread_id = ?' : '';
  const values = threadOnly
    ? [identity.tenantId, identity.userId, identity.threadId]
    : [identity.tenantId, identity.userId];
  const turns = await bindings.MEMORY_DB.prepare(
    `SELECT id FROM memory_turns WHERE tenant_id = ? AND user_id = ?${clause}`,
  ).bind(...values).all<{ id: string }>();
  await bindings.MEMORY_DB.prepare(
    `DELETE FROM memory_turns WHERE tenant_id = ? AND user_id = ?${clause}`,
  ).bind(...values).run();
  return json({ deleted: turns.results.length });
};

/** Handles only the Agent Worker's private `/internal/memory/*` routes. */
export const handleMemoryRequest = async (
  request: Request,
  bindings: MemoryBindings,
  pathname: string,
): Promise<Response> => {
  if (request.method === 'POST' && pathname === '/v1/turns') return await appendTurn(request, bindings);
  if (request.method === 'POST' && pathname === '/v1/retrieve') return await retrieve(request, bindings);
  if (request.method === 'POST' && pathname === '/v1/turns/list') return await listTurns(request, bindings);
  if (request.method === 'POST' && pathname === '/v1/threads/list') return await listThreads(request, bindings);
  if (request.method === 'DELETE' && pathname === '/v1/threads') return await deleteScope(request, bindings, true);
  if (request.method === 'DELETE' && pathname === '/v1/users') return await deleteScope(request, bindings, false);
  return json({ error: 'Not found' }, 404);
};
