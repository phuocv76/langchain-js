// Internal
import type { KnowledgeStore } from '../stores/types.js';

/** @deprecated Use `operations.ingestKnowledgeContent` with a KnowledgeStore. */
export const ingestKnowledgeContent = async (
  db: import('better-sqlite3').Database,
  input: {
    apiKey: string;
    content: string;
    createdBy?: string | null;
  },
) => {
  const { createSqliteStores } = await import('../stores/sqlite.js');
  const { ingestKnowledgeContent: ingest } = await import('./operations.js');
  return ingest(createSqliteStores(db).knowledge, input);
};

export type { KnowledgeStore };
