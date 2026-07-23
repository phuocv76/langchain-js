// LangGraph thread-metadata endpoints for the embedded platform API.
//
// Checkpoints carry the conversation state; these rows only record that a
// thread exists and its platform metadata (graph_id, client labels) so the
// thread API survives agent restarts. Every statement is scoped by user_id:
// a request carrying the wrong user simply sees no rows.

import { type Env, isString, json } from './shared';

/** Metadata is small structured JSON; anything larger is a client bug. */
const MAX_METADATA_LENGTH = 16_384;

type ThreadScope = {
  readonly userId: string;
  readonly threadId: string;
};

const parseScope = (value: unknown): ThreadScope | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  if (!isString(candidate.userId) || !isString(candidate.threadId)) {
    return undefined;
  }
  return { userId: candidate.userId, threadId: candidate.threadId };
};

type ThreadRow = {
  thread_id: string;
  metadata: string;
  created_at: string;
  updated_at: string;
};

const toThread = (row: ThreadRow) => ({
  threadId: row.thread_id,
  metadata: row.metadata,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const selectThread = (scope: ThreadScope, env: Env) =>
  env.MEMORY_DB.prepare(
    `SELECT thread_id, metadata, created_at, updated_at
     FROM thread_store
     WHERE user_id = ? AND thread_id = ?`,
  )
    .bind(scope.userId, scope.threadId)
    .first<ThreadRow>();

const get = async (body: unknown, env: Env): Promise<Response> => {
  const scope = parseScope(body);
  if (!scope) return json({ error: 'Invalid thread lookup payload' }, 400);
  const row = await selectThread(scope, env);
  return json({ thread: row ? toThread(row) : null });
};

const set = async (body: unknown, env: Env): Promise<Response> => {
  const scope = parseScope(body);
  const candidate = body as Record<string, unknown> | undefined;
  const kind = candidate?.kind;
  const metadata = candidate?.metadata;
  if (
    !scope ||
    (kind !== 'put' && kind !== 'patch') ||
    (metadata !== undefined && !isString(metadata)) ||
    (isString(metadata) && metadata.length > MAX_METADATA_LENGTH)
  ) {
    return json({ error: 'Invalid thread set payload' }, 400);
  }

  // `put` replaces the metadata document; `patch` shallow-merges it, which
  // is the semantic the embed ThreadSaver contract expects. json_patch
  // performs the merge inside SQLite so the upsert stays a single statement.
  const statement =
    kind === 'put'
      ? env.MEMORY_DB.prepare(
          `INSERT INTO thread_store (user_id, thread_id, metadata)
           VALUES (?, ?, ?)
           ON CONFLICT (user_id, thread_id)
           DO UPDATE SET metadata = excluded.metadata, updated_at = CURRENT_TIMESTAMP`,
        ).bind(scope.userId, scope.threadId, metadata ?? '{}')
      : env.MEMORY_DB.prepare(
          `INSERT INTO thread_store (user_id, thread_id, metadata)
           VALUES (?, ?, ?)
           ON CONFLICT (user_id, thread_id)
           DO UPDATE SET metadata = json_patch(thread_store.metadata, excluded.metadata),
                         updated_at = CURRENT_TIMESTAMP`,
        ).bind(scope.userId, scope.threadId, metadata ?? '{}');
  await statement.run();

  const row = await selectThread(scope, env);
  if (!row) return json({ error: 'Thread write did not persist' }, 500);
  return json({ thread: toThread(row) });
};

const remove = async (body: unknown, env: Env): Promise<Response> => {
  const scope = parseScope(body);
  if (!scope) return json({ error: 'Invalid thread deletion payload' }, 400);
  await env.MEMORY_DB.prepare(
    `DELETE FROM thread_store WHERE user_id = ? AND thread_id = ?`,
  )
    .bind(scope.userId, scope.threadId)
    .run();
  return json({ ok: true });
};

/**
 * Routes `POST /v1/thread-store/*` requests; returns undefined for paths
 * this module does not own so the main router can fall through.
 */
export const handleThreadStoreRequest = async (
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response | undefined> => {
  if (request.method !== 'POST' || !pathname.startsWith('/v1/thread-store/')) {
    return undefined;
  }
  const body: unknown = await request.json().catch(() => undefined);
  switch (pathname) {
    case '/v1/thread-store/get':
      return get(body, env);
    case '/v1/thread-store/set':
      return set(body, env);
    case '/v1/thread-store/delete':
      return remove(body, env);
    default:
      return undefined;
  }
};
