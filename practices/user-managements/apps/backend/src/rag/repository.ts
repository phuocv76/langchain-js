// Libs for third party
import type Database from 'better-sqlite3';

export type KnowledgeChunkRow = {
  content: string;
  embedding: string;
};

/** Returns total knowledge chunk count. */
export const countKnowledgeChunks = (db: Database.Database): number => {
  const row = db
    .prepare('SELECT COUNT(*) AS n FROM knowledge_chunks')
    .get() as { n: number };
  return row?.n ?? 0;
};

/** Lists stored chunk vectors, optionally scoped by creator. */
export const listKnowledgeChunks = (
  db: Database.Database,
  createdBy?: string | null,
): KnowledgeChunkRow[] => {
  if (createdBy === undefined) {
    return db
      .prepare('SELECT content, embedding FROM knowledge_chunks')
      .all() as KnowledgeChunkRow[];
  }

  return db
    .prepare(
      `SELECT kc.content, kc.embedding
       FROM knowledge_chunks kc
       INNER JOIN knowledge_resources kr ON kr.id = kc.resource_id
       WHERE kr.created_by = ?`,
    )
    .all(createdBy) as KnowledgeChunkRow[];
};

/** Inserts a parent knowledge resource entry. */
export const insertKnowledgeResource = (
  db: Database.Database,
  input: {
    id: string;
    content: string;
    createdBy: string | null;
    createdAt: number;
  },
): void => {
  db.prepare(
    'INSERT INTO knowledge_resources (id, content, created_by, created_at) VALUES (?, ?, ?, ?)',
  ).run(input.id, input.content, input.createdBy, input.createdAt);
};

/** Inserts child chunk vectors for a resource. */
export const insertKnowledgeChunks = (
  db: Database.Database,
  rows: {
    id: string;
    resourceId: string;
    content: string;
    embedding: number[];
  }[],
): void => {
  const stmt = db.prepare(
    'INSERT INTO knowledge_chunks (id, resource_id, content, embedding) VALUES (?, ?, ?, ?)',
  );
  const insertMany = db.transaction((items: typeof rows) => {
    for (const row of items) {
      stmt.run(
        row.id,
        row.resourceId,
        row.content,
        JSON.stringify(row.embedding),
      );
    }
  });
  insertMany(rows);
};

/** Returns newest knowledge resource for a creator. */
export const getLatestKnowledgeResourceByCreatedBy = (
  db: Database.Database,
  createdBy: string | null,
): { id: string; content: string } | null => {
  const row = db
    .prepare(
      `SELECT id, content FROM knowledge_resources
       WHERE created_by = ?
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(createdBy) as { id: string; content: string } | undefined;
  return row ?? null;
};

/** Deletes creator resources, optionally preserving one resource id. */
export const deleteKnowledgeResourcesByCreatedBy = (
  db: Database.Database,
  createdBy: string | null,
  exceptId?: string,
): void => {
  if (exceptId) {
    db.prepare(
      'DELETE FROM knowledge_resources WHERE created_by = ? AND id <> ?',
    ).run(createdBy, exceptId);
    return;
  }
  db.prepare('DELETE FROM knowledge_resources WHERE created_by = ?').run(
    createdBy,
  );
};
