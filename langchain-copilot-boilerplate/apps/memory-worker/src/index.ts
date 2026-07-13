export interface Env {
  readonly MEMORY_DB: D1Database;
  readonly MEMORY_INDEX: VectorizeIndex;
  readonly AI: Ai;
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

const requireAccess = (request: Request): Response | undefined => {
  // Cloudflare Access validates the service token before this Worker executes.
  // The assertion header proves the request crossed that Access boundary.
  if (!request.headers.get('cf-access-jwt-assertion')) {
    return json({ error: 'Cloudflare Access authentication is required' }, 401);
  }
};

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

const chunkText = (content: string, maxLength = 800): string[] => {
  const normalized = content.trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  for (let start = 0; start < normalized.length; start += maxLength) {
    chunks.push(normalized.slice(start, start + maxLength));
  }
  return chunks;
};

const embed = async (env: Env, texts: readonly string[]): Promise<number[][]> => {
  const result = (await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: texts,
  })) as { data: number[][] };
  return result.data;
};

const appendTurn = async (request: Request, env: Env): Promise<Response> => {
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
  await env.MEMORY_DB.prepare(
    `INSERT INTO memory_turns
      (id, tenant_id, user_id, thread_id, request_id, role, content, tool_metadata, vector_chunk_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      chunkText(candidate.content).length,
    )
    .run();

  const chunks = chunkText(candidate.content);
  if (chunks.length > 0) {
    const embeddings = await embed(env, chunks);
    await env.MEMORY_INDEX.upsert(
      embeddings.map((values, index) => ({
        id: `${turnId}:${index}`,
        values,
        metadata: {
          turnId,
          tenantId: identity.tenantId,
          userId: identity.userId,
          threadId: identity.threadId,
        },
      })),
    );
  }

  return json({ id: turnId }, 201);
};

const retrieve = async (request: Request, env: Env): Promise<Response> => {
  const body: unknown = await request.json().catch(() => undefined);
  const identity = parseIdentity(body);
  const query = body && typeof body === 'object' ? (body as Record<string, unknown>).query : undefined;
  if (!identity || !isString(query)) {
    return json({ error: 'Invalid memory retrieval payload' }, 400);
  }

  const [queryEmbedding] = await embed(env, [query]);
  const matches = await env.MEMORY_INDEX.query(queryEmbedding, {
    topK: 6,
    returnMetadata: 'all',
    filter: { tenantId: identity.tenantId, userId: identity.userId },
  });
  const turnIds = [
    ...new Set(
      matches.matches
        .map((match) => match.metadata?.turnId)
        .filter(isString),
    ),
  ];
  const semanticTurns = turnIds.length
    ? await env.MEMORY_DB.prepare(
        `SELECT id, thread_id, role, content, created_at
         FROM memory_turns
         WHERE tenant_id = ? AND user_id = ? AND id IN (${turnIds.map(() => '?').join(', ')})`,
      )
        .bind(identity.tenantId, identity.userId, ...turnIds)
        .all()
    : { results: [] };
  const recentTurns = await env.MEMORY_DB.prepare(
    `SELECT id, thread_id, role, content, created_at
     FROM memory_turns
     WHERE tenant_id = ? AND user_id = ? AND thread_id = ?
     ORDER BY created_at DESC LIMIT 8`,
  )
    .bind(identity.tenantId, identity.userId, identity.threadId)
    .all();

  return json({ semanticTurns: semanticTurns.results, recentTurns: recentTurns.results });
};

const listTurns = async (request: Request, env: Env): Promise<Response> => {
  const body: unknown = await request.json().catch(() => undefined);
  const identity = parseIdentity(body);
  if (!identity) return json({ error: 'Invalid list payload' }, 400);
  const turns = await env.MEMORY_DB.prepare(
    `SELECT id, thread_id, role, content, created_at
     FROM memory_turns
     WHERE tenant_id = ? AND user_id = ? AND thread_id = ?
     ORDER BY created_at DESC LIMIT 100`,
  )
    .bind(identity.tenantId, identity.userId, identity.threadId)
    .all();
  return json({ turns: turns.results });
};

const listThreads = async (request: Request, env: Env): Promise<Response> => {
  const body: unknown = await request.json().catch(() => undefined);
  const identity = parseIdentity(body);
  if (!identity) return json({ error: 'Invalid thread list payload' }, 400);
  const threads = await env.MEMORY_DB.prepare(
    `SELECT thread_id,
        MIN(CASE WHEN role = 'user' THEN content END) AS title,
        MAX(created_at) AS updated_at
     FROM memory_turns
     WHERE tenant_id = ? AND user_id = ?
     GROUP BY thread_id
     ORDER BY updated_at DESC LIMIT 100`,
  )
    .bind(identity.tenantId, identity.userId)
    .all();
  return json({ threads: threads.results });
};

const deleteScope = async (
  request: Request,
  env: Env,
  threadOnly: boolean,
): Promise<Response> => {
  const body: unknown = await request.json().catch(() => undefined);
  const identity = parseIdentity(body);
  if (!identity) return json({ error: 'Invalid deletion payload' }, 400);
  const clause = threadOnly ? ' AND thread_id = ?' : '';
  const bindings = threadOnly
    ? [identity.tenantId, identity.userId, identity.threadId]
    : [identity.tenantId, identity.userId];
  const turns = await env.MEMORY_DB.prepare(
    `SELECT id, vector_chunk_count FROM memory_turns WHERE tenant_id = ? AND user_id = ?${clause}`,
  )
    .bind(...bindings)
    .all<{ id: string; vector_chunk_count: number }>();
  const vectorIds = turns.results.flatMap((turn) =>
    Array.from({ length: turn.vector_chunk_count }, (_, index) => `${turn.id}:${index}`),
  );
  if (vectorIds.length > 0) await env.MEMORY_INDEX.deleteByIds(vectorIds);
  await env.MEMORY_DB.prepare(
    `DELETE FROM memory_turns WHERE tenant_id = ? AND user_id = ?${clause}`,
  )
    .bind(...bindings)
    .run();
  return json({ deleted: turns.results.length });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const accessError = requireAccess(request);
    if (accessError) return accessError;
    const pathname = new URL(request.url).pathname;
    if (request.method === 'POST' && pathname === '/v1/turns')
      return appendTurn(request, env);
    if (request.method === 'POST' && pathname === '/v1/retrieve')
      return retrieve(request, env);
    if (request.method === 'POST' && pathname === '/v1/turns/list')
      return listTurns(request, env);
    if (request.method === 'POST' && pathname === '/v1/threads/list')
      return listThreads(request, env);
    if (request.method === 'DELETE' && pathname === '/v1/threads')
      return deleteScope(request, env, true);
    if (request.method === 'DELETE' && pathname === '/v1/users')
      return deleteScope(request, env, false);
    return json({ error: 'Not found' }, 404);
  },
} satisfies ExportedHandler<Env>;
