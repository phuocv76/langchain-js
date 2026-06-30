-- Migration number: 0006 	 2026-06-03T00:00:00.000Z

-- Multi-thread chat was removed; clean up its obsolete table/index.
DROP INDEX IF EXISTS idx_chat_threads_user_id;
DROP TABLE IF EXISTS chat_threads;
