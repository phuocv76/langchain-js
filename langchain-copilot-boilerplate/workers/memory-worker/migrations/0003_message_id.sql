-- The engine-assigned chat message id for this turn. Lets history reads
-- return the same ids a later run snapshot carries, so clients can merge
-- instead of duplicating. Nullable: rows written before this column exist
-- fall back to the row id.
ALTER TABLE memory_turns ADD COLUMN message_id TEXT;
