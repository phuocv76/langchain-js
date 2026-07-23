// LangGraph checkpoint endpoints (short-term engine memory in D1).
//
// The Node agent owns checkpoint (de)serialization; this module stores the
// payloads as opaque base64 text and never inspects them. `metadata` is
// plain JSON text so `list` can filter it in SQL. Every statement is scoped
// by user_id: a request carrying the wrong user simply sees no rows, so a
// guessed thread UUID can never surface another user's conversation state.

import { type Env, isString, json } from './shared';

/**
 * D1 caps strings/blobs at 2,000,000 bytes per value; reject earlier with a
 * clear error instead of letting the insert fail mid-batch.
 */
const MAX_PAYLOAD_LENGTH = 2_000_000;

/**
 * Checkpoints per (thread, namespace) kept after each put. Checkpoint ids
 * are uuid6 (time-ordered), so "latest N by id" is "newest N". History
 * beyond this window only serves time travel, which this product does not
 * expose; pruning inline keeps the table bounded without a cron job.
 */
const KEEP_CHECKPOINTS = 20;

type CheckpointScope = {
  readonly userId: string;
  readonly threadId: string;
  readonly checkpointNs: string;
};

const parseScope = (value: unknown): CheckpointScope | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const candidate = value as Record<string, unknown>;
  // The default namespace is the empty string, so unlike other ids the
  // namespace may be empty — only its type is validated.
  if (
    !isString(candidate.userId) ||
    !isString(candidate.threadId) ||
    typeof (candidate.checkpointNs ?? '') !== 'string'
  ) {
    return undefined;
  }
  return {
    userId: candidate.userId,
    threadId: candidate.threadId,
    checkpointNs: (candidate.checkpointNs as string | undefined) ?? '',
  };
};

const getTuple = async (body: unknown, env: Env): Promise<Response> => {
  const scope = parseScope(body);
  const checkpointId = (body as Record<string, unknown>)?.checkpointId;
  if (!scope || (checkpointId !== undefined && !isString(checkpointId))) {
    return json({ error: 'Invalid checkpoint lookup payload' }, 400);
  }

  const row = await env.MEMORY_DB.prepare(
    `SELECT checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata
     FROM checkpoints
     WHERE user_id = ? AND thread_id = ? AND checkpoint_ns = ?
       ${checkpointId ? 'AND checkpoint_id = ?' : ''}
     ORDER BY checkpoint_id DESC LIMIT 1`,
  )
    .bind(
      scope.userId,
      scope.threadId,
      scope.checkpointNs,
      ...(checkpointId ? [checkpointId] : []),
    )
    .first<{
      checkpoint_id: string;
      parent_checkpoint_id: string | null;
      type: string | null;
      checkpoint: string;
      metadata: string;
    }>();
  if (!row) return json({ tuple: null });

  const writes = await env.MEMORY_DB.prepare(
    `SELECT task_id, channel, type, value
     FROM checkpoint_writes
     WHERE user_id = ? AND thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?
     ORDER BY task_id, idx`,
  )
    .bind(scope.userId, scope.threadId, scope.checkpointNs, row.checkpoint_id)
    .all<{ task_id: string; channel: string; type: string | null; value: string }>();

  return json({
    tuple: {
      checkpointId: row.checkpoint_id,
      parentCheckpointId: row.parent_checkpoint_id,
      type: row.type,
      checkpoint: row.checkpoint,
      metadata: row.metadata,
      pendingWrites: writes.results.map((write) => ({
        taskId: write.task_id,
        channel: write.channel,
        type: write.type,
        value: write.value,
      })),
    },
  });
};

const put = async (body: unknown, env: Env): Promise<Response> => {
  const scope = parseScope(body);
  const candidate = body as Record<string, unknown> | undefined;
  if (
    !scope ||
    !candidate ||
    !isString(candidate.checkpointId) ||
    (candidate.parentCheckpointId !== undefined &&
      candidate.parentCheckpointId !== null &&
      !isString(candidate.parentCheckpointId)) ||
    !isString(candidate.type) ||
    !isString(candidate.checkpoint) ||
    !isString(candidate.metadata)
  ) {
    return json({ error: 'Invalid checkpoint put payload' }, 400);
  }
  if (candidate.checkpoint.length > MAX_PAYLOAD_LENGTH) {
    return json({ error: 'Checkpoint payload exceeds the D1 value size limit' }, 413);
  }

  // The prune subqueries run after the insert inside one atomic batch, so
  // the new checkpoint always counts toward (and survives) the keep window.
  const pruneCondition = `
     WHERE user_id = ? AND thread_id = ? AND checkpoint_ns = ?
       AND checkpoint_id NOT IN (
         SELECT checkpoint_id FROM checkpoints
         WHERE user_id = ? AND thread_id = ? AND checkpoint_ns = ?
         ORDER BY checkpoint_id DESC LIMIT ${KEEP_CHECKPOINTS}
       )`;
  const pruneBindings = [
    scope.userId,
    scope.threadId,
    scope.checkpointNs,
    scope.userId,
    scope.threadId,
    scope.checkpointNs,
  ];
  await env.MEMORY_DB.batch([
    env.MEMORY_DB.prepare(
      `INSERT OR REPLACE INTO checkpoints
        (user_id, thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      scope.userId,
      scope.threadId,
      scope.checkpointNs,
      candidate.checkpointId,
      candidate.parentCheckpointId ?? null,
      candidate.type,
      candidate.checkpoint,
      candidate.metadata,
    ),
    env.MEMORY_DB.prepare(`DELETE FROM checkpoint_writes${pruneCondition}`).bind(
      ...pruneBindings,
    ),
    env.MEMORY_DB.prepare(`DELETE FROM checkpoints${pruneCondition}`).bind(
      ...pruneBindings,
    ),
  ]);
  return json({ ok: true });
};

type CheckpointWrite = {
  readonly idx: number;
  readonly channel: string;
  readonly type: string | null;
  readonly value: string;
};

const isWrite = (value: unknown): value is CheckpointWrite => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.idx === 'number' &&
    Number.isInteger(candidate.idx) &&
    isString(candidate.channel) &&
    (candidate.type === null || isString(candidate.type)) &&
    typeof candidate.value === 'string' &&
    candidate.value.length <= MAX_PAYLOAD_LENGTH
  );
};

const putWrites = async (body: unknown, env: Env): Promise<Response> => {
  const scope = parseScope(body);
  const candidate = body as Record<string, unknown> | undefined;
  const writes = candidate?.writes;
  if (
    !scope ||
    !candidate ||
    !isString(candidate.checkpointId) ||
    !isString(candidate.taskId) ||
    typeof candidate.replace !== 'boolean' ||
    !Array.isArray(writes) ||
    writes.length === 0 ||
    !writes.every(isWrite)
  ) {
    return json({ error: 'Invalid checkpoint writes payload' }, 400);
  }

  // One statement per row (D1 caps bound parameters per statement), all in a
  // single atomic batch: a resumed or retried task either lands all of its
  // writes or none. The agent decides the conflict mode — sentinel rows
  // (error/interrupt/resume) overwrite, task writes stay idempotent.
  const verb = candidate.replace ? 'INSERT OR REPLACE' : 'INSERT OR IGNORE';
  await env.MEMORY_DB.batch(
    writes.map((write) =>
      env.MEMORY_DB.prepare(
        `${verb} INTO checkpoint_writes
          (user_id, thread_id, checkpoint_ns, checkpoint_id, task_id, idx, channel, type, value)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        scope.userId,
        scope.threadId,
        scope.checkpointNs,
        candidate.checkpointId,
        candidate.taskId,
        write.idx,
        write.channel,
        write.type,
        write.value,
      ),
    ),
  );
  return json({ ok: true });
};

const METADATA_KEY_PATTERN = /^[A-Za-z0-9_]+$/;

const list = async (body: unknown, env: Env): Promise<Response> => {
  const scope = parseScope(body);
  const candidate = body as Record<string, unknown> | undefined;
  const before = candidate?.beforeCheckpointId;
  const limit = candidate?.limit;
  const filter = candidate?.filter;
  if (
    !scope ||
    (before !== undefined && !isString(before)) ||
    (limit !== undefined && (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1)) ||
    (filter !== undefined && (typeof filter !== 'object' || filter === null))
  ) {
    return json({ error: 'Invalid checkpoint list payload' }, 400);
  }

  const clauses = ['user_id = ?', 'thread_id = ?', 'checkpoint_ns = ?'];
  const bindings: unknown[] = [scope.userId, scope.threadId, scope.checkpointNs];
  if (before) {
    // uuid6 checkpoint ids are lexicographically time-ordered, so id
    // comparison doubles as "strictly older than".
    clauses.push('checkpoint_id < ?');
    bindings.push(before);
  }
  for (const [key, value] of Object.entries(filter ?? {})) {
    if (!METADATA_KEY_PATTERN.test(key)) {
      return json({ error: `Unsupported metadata filter key: ${key}` }, 400);
    }
    if (value === null) {
      clauses.push(`json_extract(metadata, '$.${key}') IS NULL`);
    } else if (typeof value === 'boolean') {
      // SQLite's json_extract surfaces JSON booleans as 1/0.
      clauses.push(`json_extract(metadata, '$.${key}') = ?`);
      bindings.push(value ? 1 : 0);
    } else if (typeof value === 'string' || typeof value === 'number') {
      clauses.push(`json_extract(metadata, '$.${key}') = ?`);
      bindings.push(value);
    } else {
      return json({ error: `Unsupported metadata filter value for: ${key}` }, 400);
    }
  }

  const rows = await env.MEMORY_DB.prepare(
    `SELECT checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata
     FROM checkpoints
     WHERE ${clauses.join(' AND ')}
     ORDER BY checkpoint_id DESC LIMIT ?`,
  )
    .bind(...bindings, Math.min(typeof limit === 'number' ? limit : 100, 100))
    .all<{
      checkpoint_id: string;
      parent_checkpoint_id: string | null;
      type: string | null;
      checkpoint: string;
      metadata: string;
    }>();
  return json({
    checkpoints: rows.results.map((row) => ({
      checkpointId: row.checkpoint_id,
      parentCheckpointId: row.parent_checkpoint_id,
      type: row.type,
      checkpoint: row.checkpoint,
      metadata: row.metadata,
    })),
  });
};

const deleteThread = async (body: unknown, env: Env): Promise<Response> => {
  const candidate = body as Record<string, unknown> | undefined;
  const threadId = candidate?.threadId;
  const userId = candidate?.userId;
  // The saver contract's deleteThread(threadId) carries no user context, so
  // userId is optional here. Deletion without it only destroys data — it can
  // never read another user's rows — and agent callers that do know the user
  // still pass it to keep the blast radius scoped.
  if (!isString(threadId) || (userId !== undefined && !isString(userId))) {
    return json({ error: 'Invalid checkpoint deletion payload' }, 400);
  }
  const userClause = userId ? ' AND user_id = ?' : '';
  const bindings = userId ? [threadId, userId] : [threadId];
  // Namespace is intentionally ignored: deleting a thread removes every
  // namespace under it, matching the saver contract's deleteThread(threadId).
  await env.MEMORY_DB.batch([
    env.MEMORY_DB.prepare(
      `DELETE FROM checkpoint_writes WHERE thread_id = ?${userClause}`,
    ).bind(...bindings),
    env.MEMORY_DB.prepare(
      `DELETE FROM checkpoints WHERE thread_id = ?${userClause}`,
    ).bind(...bindings),
  ]);
  return json({ ok: true });
};

/**
 * Routes `POST /v1/checkpoints/*` requests; returns undefined for paths this
 * module does not own so the main router can fall through.
 */
export const handleCheckpointRequest = async (
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response | undefined> => {
  if (request.method !== 'POST' || !pathname.startsWith('/v1/checkpoints/')) {
    return undefined;
  }
  const body: unknown = await request.json().catch(() => undefined);
  switch (pathname) {
    case '/v1/checkpoints/get-tuple':
      return getTuple(body, env);
    case '/v1/checkpoints/put':
      return put(body, env);
    case '/v1/checkpoints/put-writes':
      return putWrites(body, env);
    case '/v1/checkpoints/list':
      return list(body, env);
    case '/v1/checkpoints/delete-thread':
      return deleteThread(body, env);
    default:
      return undefined;
  }
};
