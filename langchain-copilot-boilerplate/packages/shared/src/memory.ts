/**
 * Identity scope for durable-memory operations — the HTTP contract between
 * the agent's memory client and the memory worker.
 */
export interface MemoryIdentity {
  readonly requestId: string;
  readonly userId: string;
  readonly threadId: string;
}

/** One transcript turn as sent to the memory worker. */
export interface MemoryTurn extends MemoryIdentity {
  readonly role: 'user' | 'assistant' | 'tool';
  readonly content: string;
  /** Engine-assigned chat message id; lets history reads dedupe against live runs. */
  readonly messageId?: string;
  readonly toolMetadata?: unknown;
}
