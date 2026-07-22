import { handleCheckpointRequest } from './checkpoints';
import { handleThreadStoreRequest } from './thread-store';
import { type Env, isString, json } from './shared';

export type { Env } from './shared';

type Identity = {
  readonly userId: string;
  readonly threadId: string;
  readonly requestId: string;
};

type MemoryTurn = Identity & {
  readonly role: 'user' | 'assistant' | 'tool';
  readonly content: string;
  /** Engine-assigned chat message id; lets history reads dedupe against live runs. */
  readonly messageId?: string;
  readonly toolMetadata?: unknown;
};

const requireAccess = (request: Request, env: Env): Response | undefined => {
  // Cloudflare Access validates the service token before this Worker executes.
  // The assertion header proves the request crossed that Access boundary.
  // Local `wrangler dev` never crosses Access, so it needs the explicit opt-out.
  if (env.REQUIRE_CF_ACCESS === 'false') return undefined;
  if (!request.headers.get('cf-access-jwt-assertion')) {
    return json({ error: 'Cloudflare Access authentication is required' }, 401);
  }
};

const parseIdentity = (value: unknown): Identity | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  if (
    !isString(candidate.userId) ||
    !isString(candidate.threadId) ||
    !isString(candidate.requestId)
  ) {
    return undefined;
  }
  return {
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
  if (!env.AI) throw new Error('AI binding is not available in this environment');
  // The generated model-name unions in @cloudflare/workers-types change
  // between releases; a structural view of run() keeps this call stable.
  const ai = env.AI as unknown as {
    run: (
      model: string,
      inputs: { text: readonly string[] },
    ) => Promise<{ data: number[][] }>;
  };
  const result = await ai.run('@cf/baai/bge-base-en-v1.5', { text: texts });
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
    !isString(candidate.content) ||
    (candidate.messageId !== undefined && !isString(candidate.messageId))
  ) {
    return json({ error: 'Invalid memory turn payload' }, 400);
  }

  // Detect first turn for this thread before insert so the agent can emit
  // THREAD_CREATED vs THREAD_UPDATED accurately.
  const existing = await env.MEMORY_DB.prepare(
    `SELECT 1 AS present FROM memory_turns
     WHERE user_id = ? AND thread_id = ?
     LIMIT 1`,
  )
    .bind(identity.userId, identity.threadId)
    .first<{ present: number }>();
  const isNewThread = !existing;

  const turnId = crypto.randomUUID();
  await env.MEMORY_DB.prepare(
    `INSERT INTO memory_turns
      (id, user_id, thread_id, request_id, role, content, message_id, tool_metadata, vector_chunk_count)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      turnId,
      identity.userId,
      identity.threadId,
      identity.requestId,
      candidate.role,
      candidate.content,
      candidate.messageId ?? null,
      candidate.toolMetadata === undefined
        ? null
        : JSON.stringify(candidate.toolMetadata),
      chunkText(candidate.content).length,
    )
    .run();

  // Semantic indexing is best-effort: the durable D1 record above is the
  // source of truth, and embeddings may be unavailable in local dev.
  // Deleting later with a stale vector_chunk_count is harmless because
  // deleteByIds ignores ids that were never indexed.
  const chunks = chunkText(candidate.content);
  if (chunks.length > 0 && env.MEMORY_INDEX) {
    const index = env.MEMORY_INDEX;
    try {
      const embeddings = await embed(env, chunks);
      await index.upsert(
        embeddings.map((values, index) => ({
          id: `${turnId}:${index}`,
          values,
          metadata: {
            turnId,
            userId: identity.userId,
            threadId: identity.threadId,
          },
        })),
      );
    } catch (error) {
      console.warn(
        `Semantic indexing skipped for turn ${turnId}:`,
        error instanceof Error ? error.message : 'unknown error',
      );
    }
  }

  return json({ id: turnId, isNewThread }, 201);
};

const retrieve = async (request: Request, env: Env): Promise<Response> => {
  const body: unknown = await request.json().catch(() => undefined);
  const identity = parseIdentity(body);
  const query = body && typeof body === 'object' ? (body as Record<string, unknown>).query : undefined;
  if (!identity || !isString(query)) {
    return json({ error: 'Invalid memory retrieval payload' }, 400);
  }

  // Semantic search degrades to an empty list when embeddings are
  // unavailable; recent turns below still provide short-term recall.
  let turnIds: string[] = [];
  try {
    if (!env.MEMORY_INDEX) throw new Error('Vectorize binding is not available');
    const [queryEmbedding] = await embed(env, [query]);
    if (!queryEmbedding) throw new Error('embedding model returned no vector');
    const matches = await env.MEMORY_INDEX.query(queryEmbedding, {
      topK: 6,
      returnMetadata: 'all',
      filter: { userId: identity.userId },
    });
    turnIds = [
      ...new Set(
        matches.matches
          .map((match) => match.metadata?.turnId)
          .filter(isString),
      ),
    ];
  } catch (error) {
    console.warn(
      'Semantic retrieval skipped:',
      error instanceof Error ? error.message : 'unknown error',
    );
  }
  const semanticTurns = turnIds.length
    ? await env.MEMORY_DB.prepare(
        `SELECT id, thread_id, role, content, created_at
         FROM memory_turns
         WHERE user_id = ? AND id IN (${turnIds.map(() => '?').join(', ')})`,
      )
        .bind(identity.userId, ...turnIds)
        .all()
    : { results: [] };
  const recentTurns = await env.MEMORY_DB.prepare(
    `SELECT id, thread_id, role, content, created_at
     FROM memory_turns
     WHERE user_id = ? AND thread_id = ?
     ORDER BY created_at DESC LIMIT 8`,
  )
    .bind(identity.userId, identity.threadId)
    .all();

  return json({ semanticTurns: semanticTurns.results, recentTurns: recentTurns.results });
};

const listTurns = async (request: Request, env: Env): Promise<Response> => {
  const body: unknown = await request.json().catch(() => undefined);
  const identity = parseIdentity(body);
  if (!identity) return json({ error: 'Invalid list payload' }, 400);
  // created_at has second precision, so the user and assistant turns of one
  // exchange can share a timestamp; rowid breaks the tie by insertion order.
  const turns = await env.MEMORY_DB.prepare(
    `SELECT id, thread_id, role, content, message_id, created_at
     FROM memory_turns
     WHERE user_id = ? AND thread_id = ?
     ORDER BY created_at DESC, rowid DESC LIMIT 100`,
  )
    .bind(identity.userId, identity.threadId)
    .all();
  return json({ turns: turns.results });
};

const listThreads = async (request: Request, env: Env): Promise<Response> => {
  const body: unknown = await request.json().catch(() => undefined);
  const identity = parseIdentity(body);
  if (!identity) return json({ error: 'Invalid thread list payload' }, 400);
  // A user-set title (thread_titles) wins over the derived first user message.
  const threads = await env.MEMORY_DB.prepare(
    `SELECT t.thread_id,
        COALESCE(tt.title, MIN(CASE WHEN t.role = 'user' THEN t.content END)) AS title,
        MAX(t.created_at) AS updated_at
     FROM memory_turns t
     LEFT JOIN thread_titles tt
       ON tt.user_id = t.user_id AND tt.thread_id = t.thread_id
     WHERE t.user_id = ?
     GROUP BY t.thread_id
     ORDER BY updated_at DESC LIMIT 100`,
  )
    .bind(identity.userId)
    .all();
  return json({ threads: threads.results });
};

const renameThread = async (request: Request, env: Env): Promise<Response> => {
  const body: unknown = await request.json().catch(() => undefined);
  const identity = parseIdentity(body);
  const title =
    body && typeof body === 'object'
      ? (body as Record<string, unknown>).title
      : undefined;
  if (!identity || !isString(title) || title.length > 200) {
    return json({ error: 'Invalid rename payload' }, 400);
  }
  await env.MEMORY_DB.prepare(
    `INSERT INTO thread_titles (user_id, thread_id, title, updated_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, thread_id)
     DO UPDATE SET title = excluded.title, updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(identity.userId, identity.threadId, title)
    .run();
  return json({ ok: true });
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
    ? [identity.userId, identity.threadId]
    : [identity.userId];
  const turns = await env.MEMORY_DB.prepare(
    `SELECT id, vector_chunk_count FROM memory_turns WHERE user_id = ?${clause}`,
  )
    .bind(...bindings)
    .all<{ id: string; vector_chunk_count: number }>();
  const vectorIds = turns.results.flatMap((turn) =>
    Array.from({ length: turn.vector_chunk_count }, (_, index) => `${turn.id}:${index}`),
  );
  // Vector cleanup is best-effort: an orphaned vector can no longer resolve
  // to a D1 row, so it never reappears in retrieval results.
  if (vectorIds.length > 0 && env.MEMORY_INDEX) {
    try {
      await env.MEMORY_INDEX.deleteByIds(vectorIds);
    } catch (error) {
      console.warn(
        'Vector cleanup skipped:',
        error instanceof Error ? error.message : 'unknown error',
      );
    }
  }
  await env.MEMORY_DB.prepare(
    `DELETE FROM memory_turns WHERE user_id = ?${clause}`,
  )
    .bind(...bindings)
    .run();
  await env.MEMORY_DB.prepare(
    `DELETE FROM thread_titles WHERE user_id = ?${clause}`,
  )
    .bind(...bindings)
    .run();
  return json({ deleted: turns.results.length });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const accessError = requireAccess(request, env);
    if (accessError) return accessError;
    const pathname = new URL(request.url).pathname;
    const checkpointResponse = await handleCheckpointRequest(request, env, pathname);
    if (checkpointResponse) return checkpointResponse;
    const threadStoreResponse = await handleThreadStoreRequest(request, env, pathname);
    if (threadStoreResponse) return threadStoreResponse;
    if (request.method === 'POST' && pathname === '/v1/turns')
      return appendTurn(request, env);
    if (request.method === 'POST' && pathname === '/v1/retrieve')
      return retrieve(request, env);
    if (request.method === 'POST' && pathname === '/v1/turns/list')
      return listTurns(request, env);
    if (request.method === 'POST' && pathname === '/v1/threads/list')
      return listThreads(request, env);
    if (request.method === 'POST' && pathname === '/v1/threads/rename')
      return renameThread(request, env);
    if (request.method === 'DELETE' && pathname === '/v1/threads')
      return deleteScope(request, env, true);
    if (request.method === 'DELETE' && pathname === '/v1/users')
      return deleteScope(request, env, false);
    return json({ error: 'Not found' }, 404);
  },
} satisfies ExportedHandler<Env>;
