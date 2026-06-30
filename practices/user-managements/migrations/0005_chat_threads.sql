-- Migration number: 0005 	 2026-06-03T00:00:00.000Z

-- Persisted assistant conversations ("threads"). Each thread belongs to one
-- user and stores its full UI message list as a JSON blob so the client can
-- replay history when the thread is reopened.
CREATE TABLE chat_threads (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  messages TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_chat_threads_user_id ON chat_threads (user_id, updated_at);
