// Internal
import { getDatabase } from './client.js';

/**
 * Applies pending migrations and exits (used by `pnpm db:apply:local`).
 */
const main = (): void => {
  const db = getDatabase();
  db.close();
  console.log('[db] migrations up to date');
};

main();
