-- Migration number: 0003 	 2026-05-19T00:00:00.000Z

CREATE TABLE openai_api_key_tokens (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_openai_api_key_tokens_token ON openai_api_key_tokens (token);
