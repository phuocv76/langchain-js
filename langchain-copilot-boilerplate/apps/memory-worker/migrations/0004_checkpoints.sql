-- LangGraph checkpoint store (short-term engine memory), ported from the
-- @langchain/langgraph-checkpoint-sqlite schema. The Node agent owns
-- serialization: `checkpoint` and `value` hold the serializer payload as
-- base64 text, while `metadata` stays plain JSON so SQL can filter on it.
-- user_id scopes every query so one user can never attach to another
-- user's thread checkpoints, even with a guessed thread UUID.
CREATE TABLE checkpoints (
  user_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  parent_checkpoint_id TEXT,
  type TEXT,
  checkpoint TEXT NOT NULL,
  metadata TEXT NOT NULL,
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

-- Pending writes attached to a checkpoint. Negative idx values are the
-- engine's sentinel channels (error/interrupt/resume); task writes use
-- their natural 0..n index. The composite key makes task-retry inserts
-- idempotent (INSERT OR IGNORE) while sentinel rows may be overwritten.
CREATE TABLE checkpoint_writes (
  user_id TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  checkpoint_ns TEXT NOT NULL DEFAULT '',
  checkpoint_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  idx INTEGER NOT NULL,
  channel TEXT NOT NULL,
  type TEXT,
  value TEXT NOT NULL,
  PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);
