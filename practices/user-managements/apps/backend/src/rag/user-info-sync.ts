// Internal
/** @deprecated Use `operations.queryUserInfoFromVectorStore` with AppStores. */
export const queryUserInfoFromVectorStore = async (
  db: import('better-sqlite3').Database,
  apiKey: string,
  question: string,
) => {
  const { createSqliteStores } = await import('../stores/sqlite.js');
  const { queryUserInfoFromVectorStore: query } =
    await import('./operations.js');
  const stores = createSqliteStores(db);
  return query(stores.users, stores.knowledge, apiKey, question);
};
