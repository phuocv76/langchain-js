// Libs for Node
import { AsyncLocalStorage } from 'node:async_hooks';

// Internal
import { AGENT_HEADER_USER_ID } from '@repo/shared';

/**
 * Verified user id for D1 checkpoint scoping. Carried outside LangGraph's
 * `configurable` because LangGraph strips custom keys when it synthesizes
 * configs (resume-at-head, parentConfig walks, getState return values).
 * The value always comes from Firebase middleware — never from model input.
 */
export type CheckpointUserStore = {
  readonly userId: string;
};

const storage = new AsyncLocalStorage<CheckpointUserStore>();

/** Configurable key that mirrors the sanitized claim the embed app injects. */
export const CHECKPOINT_USER_ID_KEY = AGENT_HEADER_USER_ID;

/** Current verified user id for this async request, if any. */
export const getCheckpointUserId = (): string | undefined =>
  storage.getStore()?.userId;

/** Runs a synchronous or Promise-returning callback with the verified user. */
export const runWithCheckpointUser = <T>(userId: string, fn: () => T): T =>
  storage.run({ userId }, fn);
