-- User-set thread titles. Threads without a row keep the derived title
-- (first user message), so this stays write-only until someone renames.
CREATE TABLE IF NOT EXISTS thread_titles (
  user_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  title TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, thread_id)
);
