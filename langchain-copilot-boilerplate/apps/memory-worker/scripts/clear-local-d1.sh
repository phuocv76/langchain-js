#!/usr/bin/env bash
# Clears all chat state from the LOCAL D1 database (agent-memory, --env offline):
# transcripts, engine checkpoints, thread metadata, and thread titles.
# Schema and d1_migrations are kept, so no re-migration is needed.
# Remote/production D1 is never touched.
#
# Usage: pnpm --filter @repo/memory-worker db:clear:local
set -euo pipefail
cd "$(dirname "$0")/.."

npx wrangler d1 execute agent-memory --local --env offline --command "
  DELETE FROM memory_turns;
  DELETE FROM checkpoint_writes;
  DELETE FROM checkpoints;
  DELETE FROM thread_store;
  DELETE FROM thread_titles;
" >/dev/null

# Fold the WAL back into the main file so GUI tools (TablePlus) see the
# cleared state immediately; harmless to skip if sqlite3 is unavailable.
if command -v sqlite3 >/dev/null 2>&1; then
  for db in .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite; do
    [ "$(basename "$db")" = "metadata.sqlite" ] && continue
    sqlite3 "$db" "PRAGMA wal_checkpoint(TRUNCATE);" >/dev/null || true
  done
fi

npx wrangler d1 execute agent-memory --local --env offline --json --command "
  SELECT 'memory_turns' AS tbl, count(*) AS rows FROM memory_turns
  UNION ALL SELECT 'checkpoints', count(*) FROM checkpoints
  UNION ALL SELECT 'checkpoint_writes', count(*) FROM checkpoint_writes
  UNION ALL SELECT 'thread_store', count(*) FROM thread_store
  UNION ALL SELECT 'thread_titles', count(*) FROM thread_titles;
" 2>/dev/null | node -e "
  const rows = JSON.parse(require('fs').readFileSync(0, 'utf8'))[0].results;
  for (const r of rows) console.log(\`  \${r.tbl}: \${r.rows}\`);
"
echo "local agent-memory cleared."
