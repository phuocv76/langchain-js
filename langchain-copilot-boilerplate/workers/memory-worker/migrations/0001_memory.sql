CREATE TABLE IF NOT EXISTS memory_turns (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'tool')),
  content TEXT NOT NULL,
  tool_metadata TEXT,
  vector_chunk_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS memory_turns_scope_created
  ON memory_turns (user_id, thread_id, created_at DESC);

CREATE INDEX IF NOT EXISTS memory_turns_user_created
  ON memory_turns (user_id, created_at DESC);
