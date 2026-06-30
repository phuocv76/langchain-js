-- Migration number: 0007 	 2026-06-04T00:00:00.000Z

-- Restore multi-thread assistant conversations per user.
-- Messages are stored as UI-message JSON so a thread can be resumed later.
CREATE TABLE chat_threads (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  messages TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_chat_threads_user_id ON chat_threads (user_id, updated_at DESC);
