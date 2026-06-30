/** Grace period while a cloud thread lock may still be held (matches Intelligence TTL). */
export const THREAD_LOCK_GRACE_MS = 20_000;

/** Delay between silent retries while the thread lock grace window is active. */
export const THREAD_LOCK_RETRY_MS = 2_000;

/**
 * Returns true when CopilotKit Intelligence rejected a run because the thread
 * already has an active runner (HTTP 409).
 *
 * @param code - CopilotKit error code from `onError`.
 * @param error - Underlying error instance.
 */
export const isThreadLockError = (
  code: string | undefined,
  error: Error,
): boolean =>
  code === 'agent_thread_locked' ||
  (code === 'agent_run_failed' &&
    error.message.toLowerCase().includes('locked'));
