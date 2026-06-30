-- Migration number: 0004 	 2026-05-22T00:00:00.000Z

CREATE TABLE knowledge_resources (
  id TEXT PRIMARY KEY NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE knowledge_chunks (
  id TEXT PRIMARY KEY NOT NULL,
  resource_id TEXT NOT NULL REFERENCES knowledge_resources (id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding TEXT NOT NULL
);

CREATE INDEX idx_knowledge_chunks_resource_id ON knowledge_chunks (resource_id);
