// Libs for Node
import { AsyncLocalStorage } from 'node:async_hooks';

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

/** Configurable key that mirrors the sanitized claim the bridge also sets. */
export const CHECKPOINT_USER_ID_KEY = 'x-agent-user-id';

/** Current verified user id for this async request, if any. */
export const getCheckpointUserId = (): string | undefined =>
  storage.getStore()?.userId;

/** Runs a synchronous or Promise-returning callback with the verified user. */
export const runWithCheckpointUser = <T>(userId: string, fn: () => T): T =>
  storage.run({ userId }, fn);

/**
 * Re-enters the verified-user store on every iterator step so an async
 * generator keeps the request identity across yields — required because
 * LangGraph and AG-UI pull the stream with separate `next()` calls that
 * would otherwise leave `AsyncLocalStorage.run` after the first tick.
 */
export const withCheckpointUser = <T>(
  userId: string,
  iterable: AsyncIterable<T>,
): AsyncGenerator<T, void, undefined> => {
  const iterator = iterable[Symbol.asyncIterator]();
  const enter = <R>(fn: () => Promise<IteratorResult<T, R>>): Promise<IteratorResult<T, R>> =>
    storage.run({ userId }, fn);

  return {
    [Symbol.asyncIterator]() {
      return this;
    },
    next: () => enter(() => iterator.next()),
    return: (value) =>
      enter(() =>
        iterator.return
          ? iterator.return(value)
          : Promise.resolve({ done: true as const, value: undefined }),
      ),
    throw: (error) =>
      enter(() =>
        iterator.throw
          ? iterator.throw(error)
          : Promise.reject(error),
      ),
  };
};
