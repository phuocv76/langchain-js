// Libs for third party
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const defaultDbPath = path.join(repoRoot, 'data/user-management.db');

/** Opens (or creates) the SQLite database used for local development. */
export const openDatabase = (): Database.Database => {
  const dbPath = process.env.DATABASE_PATH ?? defaultDbPath;
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
};

/**
 * Applies all SQL migration files in order.
 *
 * @param db - SQLite database connection.
 */
export const applyMigrations = (db: Database.Database): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const migrationsDir = path.join(repoRoot, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const id = file;
    const applied = db
      .prepare('SELECT id FROM schema_migrations WHERE id = ?')
      .get(id);
    if (applied) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec(sql);
    db.prepare(
      'INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)',
    ).run(id, Date.now());
    console.log(`[db] applied ${file}`);
  }
};

let cachedDb: Database.Database | undefined;

/** Returns a singleton SQLite connection with migrations applied. */
export const getDatabase = (): Database.Database => {
  if (!cachedDb) {
    cachedDb = openDatabase();
    applyMigrations(cachedDb);
  }
  return cachedDb;
};
