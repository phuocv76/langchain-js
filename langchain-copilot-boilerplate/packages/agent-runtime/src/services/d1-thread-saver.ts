// Libs for third party
import { HTTPException } from 'hono/http-exception';

// Internal
import { env } from '../config/env.js';
import { getCheckpointUserId } from './checkpoint-user-context.js';
import {
  accessHeaders,
  requestMemoryWorker,
} from './memory-worker-client.js';

/** Thread shape the embedded LangGraph platform routes expect. */
export interface StoredThread {
  readonly thread_id: string;
  readonly metadata: Record<string, unknown>;
}

export interface ThreadSetOptions {
  readonly kind: 'put' | 'patch';
  readonly metadata?: Record<string, unknown>;
}

/**
 * Thread metadata is platform bookkeeping, but losing it breaks the thread
 * API contract (graph resolution for state reads), so failures propagate
 * instead of degrading silently — same policy as checkpoint persistence.
 */
class ThreadStoreError extends Error {
  override name = 'ThreadStoreError';
}

interface ThreadStoreOptions {
  /** Base URL of the memory worker; defaults to MEMORY_WORKER_URL. */
  readonly baseUrl?: string;
  /** Extra request headers; defaults to the Cloudflare Access pair. */
  readonly headers?: Record<string, string>;
}

type ThreadRow = {
  readonly threadId: string;
  readonly metadata: string;
};

/**
 * Thread store for the embedded LangGraph platform API, backed by D1 through
 * the memory worker. Rows are scoped by the verified user resolved from
 * AsyncLocalStorage — the embed routes always run inside the identity
 * middleware, so a guessed thread id can never surface another user's thread.
 *
 * A missing thread surfaces as an HTTP 404 (via Hono's HTTPException): the
 * embed routes let ThreadSaver errors propagate, and 404 is what platform
 * clients — including the CopilotKit LangGraph adapter — expect for "create
 * it, then".
 */
export class D1ThreadSaver {
  readonly #baseUrl?: string;
  readonly #headers: Record<string, string>;

  constructor(options: ThreadStoreOptions = {}) {
    this.#baseUrl = options.baseUrl ?? env.MEMORY_WORKER_URL;
    this.#headers = options.headers ?? accessHeaders();
  }

  #userId(): string {
    const userId = getCheckpointUserId();
    if (!userId) {
      throw new ThreadStoreError(
        'Thread access requires a verified user in the request context',
      );
    }
    return userId;
  }

  async #request<T>(path: string, body: unknown): Promise<T> {
    if (!this.#baseUrl) {
      throw new ThreadStoreError(
        'MEMORY_WORKER_URL must be configured for durable threads',
      );
    }
    return requestMemoryWorker<T>({
      baseUrl: this.#baseUrl,
      path,
      body,
      headers: this.#headers,
      context: 'Thread store',
    });
  }

  #toThread(row: ThreadRow): StoredThread {
    let metadata: unknown;
    try {
      metadata = JSON.parse(row.metadata);
    } catch {
      throw new ThreadStoreError(
        `Thread ${row.threadId} carries unreadable metadata`,
      );
    }
    return {
      thread_id: row.threadId,
      metadata: (metadata ?? {}) as Record<string, unknown>,
    };
  }

  async get(id: string): Promise<StoredThread> {
    const { thread } = await this.#request<{ thread: ThreadRow | null }>(
      '/v1/thread-store/get',
      { userId: this.#userId(), threadId: id },
    );
    if (!thread) {
      throw new HTTPException(404, { message: `Thread not found: ${id}` });
    }
    return this.#toThread(thread);
  }

  async set(id: string, options: ThreadSetOptions): Promise<StoredThread> {
    const { thread } = await this.#request<{ thread: ThreadRow }>(
      '/v1/thread-store/set',
      {
        userId: this.#userId(),
        threadId: id,
        kind: options.kind,
        metadata: JSON.stringify(options.metadata ?? {}),
      },
    );
    return this.#toThread(thread);
  }

  async delete(id: string): Promise<void> {
    await this.#request<{ ok: boolean }>('/v1/thread-store/delete', {
      userId: this.#userId(),
      threadId: id,
    });
  }
}

/**
 * In-process fallback used when MEMORY_WORKER_URL is unset (threads reset on
 * restart), mirroring the MemorySaver fallback for checkpoints. Also scoped
 * by the verified user so dev behavior matches production semantics.
 */
export const createInMemoryThreadSaver = (): Pick<
  D1ThreadSaver,
  'get' | 'set' | 'delete'
> => {
  const threads = new Map<string, StoredThread>();
  const requireUser = (): string => {
    const userId = getCheckpointUserId();
    if (!userId) {
      throw new ThreadStoreError(
        'Thread access requires a verified user in the request context',
      );
    }
    return userId;
  };
  const keyFor = (id: string): string => `${requireUser()}:${id}`;

  return {
    async get(id) {
      const found = threads.get(keyFor(id));
      if (!found) {
        throw new HTTPException(404, { message: `Thread not found: ${id}` });
      }
      return found;
    },
    async set(id, options) {
      const key = keyFor(id);
      const existing = threads.get(key);
      const metadata =
        options.kind === 'patch'
          ? { ...existing?.metadata, ...options.metadata }
          : { ...options.metadata };
      const thread: StoredThread = { thread_id: id, metadata };
      threads.set(key, thread);
      return thread;
    },
    async delete(id) {
      threads.delete(keyFor(id));
    },
  };
};
