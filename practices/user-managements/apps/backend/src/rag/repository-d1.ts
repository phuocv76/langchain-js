// Internal
import type { KnowledgeChunkRow } from './store-types.js';

/** Returns total knowledge chunk count. */
export const countKnowledgeChunks = async (db: D1Database): Promise<number> => {
  const row = await db
    .prepare('SELECT COUNT(*) AS n FROM knowledge_chunks')
    .first<{ n: number }>();
  return row?.n ?? 0;
};

/** Lists stored chunk vectors, optionally scoped by creator. */
export const listKnowledgeChunks = async (
  db: D1Database,
  createdBy?: string | null,
): Promise<KnowledgeChunkRow[]> => {
  if (createdBy === undefined) {
    const result = await db
      .prepare('SELECT content, embedding FROM knowledge_chunks')
      .all<KnowledgeChunkRow>();
    return result.results ?? [];
  }

  const result = await db
    .prepare(
      `SELECT kc.content, kc.embedding
       FROM knowledge_chunks kc
       INNER JOIN knowledge_resources kr ON kr.id = kc.resource_id
       WHERE kr.created_by = ?1`,
    )
    .bind(createdBy)
    .all<KnowledgeChunkRow>();
  return result.results ?? [];
};

/** Inserts a parent knowledge resource entry. */
export const insertKnowledgeResource = async (
  db: D1Database,
  input: {
    id: string;
    content: string;
    createdBy: string | null;
    createdAt: number;
  },
): Promise<void> => {
  await db
    .prepare(
      'INSERT INTO knowledge_resources (id, content, created_by, created_at) VALUES (?1, ?2, ?3, ?4)',
    )
    .bind(input.id, input.content, input.createdBy, input.createdAt)
    .run();
};

/** Inserts child chunk vectors for a resource. */
export const insertKnowledgeChunks = async (
  db: D1Database,
  rows: {
    id: string;
    resourceId: string;
    content: string;
    embedding: number[];
  }[],
): Promise<void> => {
  if (rows.length === 0) return;
  const statements = rows.map((row) =>
    db
      .prepare(
        'INSERT INTO knowledge_chunks (id, resource_id, content, embedding) VALUES (?1, ?2, ?3, ?4)',
      )
      .bind(row.id, row.resourceId, row.content, JSON.stringify(row.embedding)),
  );
  await db.batch(statements);
};

/** Returns newest knowledge resource for a creator. */
export const getLatestKnowledgeResourceByCreatedBy = async (
  db: D1Database,
  createdBy: string | null,
): Promise<{ id: string; content: string } | null> => {
  const row = await db
    .prepare(
      `SELECT id, content FROM knowledge_resources
       WHERE created_by = ?1
       ORDER BY created_at DESC LIMIT 1`,
    )
    .bind(createdBy)
    .first<{ id: string; content: string }>();
  return row ?? null;
};

/** Deletes creator resources, optionally preserving one resource id. */
export const deleteKnowledgeResourcesByCreatedBy = async (
  db: D1Database,
  createdBy: string | null,
  exceptId?: string,
): Promise<void> => {
  if (exceptId) {
    await db
      .prepare(
        'DELETE FROM knowledge_resources WHERE created_by = ?1 AND id <> ?2',
      )
      .bind(createdBy, exceptId)
      .run();
    return;
  }
  await db
    .prepare('DELETE FROM knowledge_resources WHERE created_by = ?1')
    .bind(createdBy)
    .run();
};
