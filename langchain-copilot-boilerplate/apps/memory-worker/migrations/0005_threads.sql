-- LangGraph thread metadata for the embedded platform API. Checkpoints hold
-- the conversation state; this table only records that a thread exists and
-- its platform metadata (graph_id, client labels) so the API survives agent
-- restarts. user_id scopes every query, same as the checkpoint tables.
CREATE TABLE thread_store (
  user_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, thread_id)
);
