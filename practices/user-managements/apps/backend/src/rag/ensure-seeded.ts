// Internal
/** @deprecated Use `operations.ensureKnowledgeBaseSeeded` with a KnowledgeStore. */
export const ensureKnowledgeBaseSeeded = async (
  db: import('better-sqlite3').Database,
  apiKey: string,
): Promise<void> => {
  const { createSqliteStores } = await import('../stores/sqlite.js');
  const { ensureKnowledgeBaseSeeded: ensure } = await import('./operations.js');
  return ensure(createSqliteStores(db).knowledge, apiKey);
};
