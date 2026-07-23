// Libs for third party
import type { RunnableConfig } from '@langchain/core/runnables';
import {
  BaseCheckpointSaver,
  WRITES_IDX_MAP,
  type ChannelVersions,
  type Checkpoint,
  type CheckpointListOptions,
  type CheckpointMetadata,
  type CheckpointPendingWrite,
  type CheckpointTuple,
  type PendingWrite,
} from '@langchain/langgraph-checkpoint';

// Internal
import { env } from '../config/env.js';
import {
  CHECKPOINT_USER_ID_KEY,
  getCheckpointUserId,
} from './checkpoint-user-context.js';
import {
  accessHeaders,
  requestMemoryWorker,
} from './memory-worker-client.js';

/**
 * Unlike the durable-memory enhancement layer, checkpoint persistence is
 * correctness-critical: a swallowed failure would silently fork or lose
 * conversation state, so every error propagates to fail the run.
 */
class CheckpointServiceError extends Error {
  override name = 'CheckpointServiceError';
}

interface CheckpointServiceOptions {
  /** Base URL of the memory worker; defaults to MEMORY_WORKER_URL. */
  readonly baseUrl?: string;
  /** Extra request headers; defaults to the Cloudflare Access pair. */
  readonly headers?: Record<string, string>;
}

/** Serialized payloads cross HTTP as base64; the worker never decodes them. */
const toBase64 = (data: Uint8Array): string => Buffer.from(data).toString('base64');
const fromBase64 = (data: string): Uint8Array =>
  new Uint8Array(Buffer.from(data, 'base64'));

type CheckpointRow = {
  readonly checkpointId: string;
  readonly parentCheckpointId: string | null;
  readonly type: string | null;
  readonly checkpoint: string;
  readonly metadata: string;
};

type PendingWriteRow = {
  readonly taskId: string;
  readonly channel: string;
  readonly type: string | null;
  readonly value: string;
};

type CheckpointScope = {
  readonly userId: string;
  readonly threadId: string;
  readonly checkpointNs: string;
};

/**
 * LangGraph checkpoint saver backed by Cloudflare D1 through the memory
 * worker. The serializer (and therefore BaseMessage revival) stays entirely
 * in this process; the worker stores opaque base64 payloads scoped by the
 * verified user so a guessed thread id can never load someone else's state.
 */
export class D1CheckpointSaver extends BaseCheckpointSaver {
  readonly #baseUrl?: string;
  readonly #headers: Record<string, string>;

  constructor(options: CheckpointServiceOptions = {}) {
    super();
    this.#baseUrl = options.baseUrl ?? env.MEMORY_WORKER_URL;
    this.#headers = options.headers ?? accessHeaders();
  }

  async #request<T>(path: string, body: unknown): Promise<T> {
    if (!this.#baseUrl) {
      throw new CheckpointServiceError(
        'MEMORY_WORKER_URL must be configured for durable checkpoints',
      );
    }
    return requestMemoryWorker<T>({
      baseUrl: this.#baseUrl,
      path,
      body,
      headers: this.#headers,
      context: 'Checkpoint service',
    });
  }

  /**
   * Resolves the user/thread scope for a checkpoint op.
   *
   * Prefer `configurable[x-agent-user-id]` when LangGraph still has it (the
   * embed app injects it into every run body). Fall back to the
   * request-scoped AsyncLocalStorage value for the configs LangGraph
   * synthesizes itself — those only carry thread_id / checkpoint_ns /
   * checkpoint_id and would otherwise fail the multi-tenant check.
   * Neither path accepts model-controlled input.
   */
  #scope(config: RunnableConfig): CheckpointScope {
    const configurable = config.configurable ?? {};
    const threadId = configurable.thread_id as unknown;
    if (typeof threadId !== 'string' || !threadId) {
      throw new CheckpointServiceError('Checkpoint access requires a thread_id');
    }
    const fromConfig = configurable[CHECKPOINT_USER_ID_KEY] as unknown;
    const userId =
      typeof fromConfig === 'string' && fromConfig
        ? fromConfig
        : getCheckpointUserId();
    if (typeof userId !== 'string' || !userId) {
      throw new CheckpointServiceError(
        'Checkpoint access requires the verified user context',
      );
    }
    const checkpointNs = configurable.checkpoint_ns as unknown;
    return {
      userId,
      threadId,
      checkpointNs: typeof checkpointNs === 'string' ? checkpointNs : '',
    };
  }

  /**
   * Echo the verified user back into returned configs so parentConfig walks
   * and `getState().config` reuse keep working without relying solely on ALS.
   */
  #tupleConfig(scope: CheckpointScope, checkpointId: string): RunnableConfig {
    return {
      configurable: {
        thread_id: scope.threadId,
        checkpoint_ns: scope.checkpointNs,
        checkpoint_id: checkpointId,
        [CHECKPOINT_USER_ID_KEY]: scope.userId,
      },
    };
  }

  async #decodeTuple(
    scope: CheckpointScope,
    row: CheckpointRow,
    pendingWriteRows: readonly PendingWriteRow[],
  ): Promise<CheckpointTuple> {
    const checkpoint = (await this.serde.loadsTyped(
      row.type ?? 'json',
      fromBase64(row.checkpoint),
    )) as Checkpoint;
    const pendingWrites: CheckpointPendingWrite[] = await Promise.all(
      pendingWriteRows.map(async (write) => [
        write.taskId,
        write.channel,
        await this.serde.loadsTyped(write.type ?? 'json', fromBase64(write.value)),
      ]),
    );
    return {
      config: this.#tupleConfig(scope, row.checkpointId),
      checkpoint,
      metadata: JSON.parse(row.metadata) as CheckpointMetadata,
      pendingWrites,
      parentConfig: row.parentCheckpointId
        ? this.#tupleConfig(scope, row.parentCheckpointId)
        : undefined,
    };
  }

  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const scope = this.#scope(config);
    const checkpointId = config.configurable?.checkpoint_id as unknown;
    const { tuple } = await this.#request<{
      tuple: (CheckpointRow & { pendingWrites: PendingWriteRow[] }) | null;
    }>('/v1/checkpoints/get-tuple', {
      ...scope,
      ...(typeof checkpointId === 'string' && checkpointId ? { checkpointId } : {}),
    });
    if (!tuple) return undefined;
    return this.#decodeTuple(scope, tuple, tuple.pendingWrites);
  }

  async *list(
    config: RunnableConfig,
    options?: CheckpointListOptions,
  ): AsyncGenerator<CheckpointTuple> {
    const scope = this.#scope(config);
    const before = options?.before?.configurable?.checkpoint_id as unknown;
    const { checkpoints } = await this.#request<{ checkpoints: CheckpointRow[] }>(
      '/v1/checkpoints/list',
      {
        ...scope,
        ...(typeof before === 'string' && before
          ? { beforeCheckpointId: before }
          : {}),
        ...(options?.limit !== undefined ? { limit: options.limit } : {}),
        ...(options?.filter !== undefined ? { filter: options.filter } : {}),
      },
    );
    for (const row of checkpoints) {
      yield this.#decodeTuple(scope, row, []);
    }
  }

  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    _newVersions: ChannelVersions,
  ): Promise<RunnableConfig> {
    const scope = this.#scope(config);
    // The full channel_values travel inside the checkpoint payload, so the
    // incremental newVersions map adds nothing here (same as the official
    // SQLite saver).
    const [type, serialized] = await this.serde.dumpsTyped(checkpoint);
    const parentCheckpointId = config.configurable?.checkpoint_id as unknown;
    await this.#request('/v1/checkpoints/put', {
      ...scope,
      checkpointId: checkpoint.id,
      parentCheckpointId:
        typeof parentCheckpointId === 'string' && parentCheckpointId
          ? parentCheckpointId
          : null,
      type,
      checkpoint: toBase64(serialized),
      // Metadata stays plain JSON text (never binary) so the worker can
      // filter it in SQL for `list`.
      metadata: JSON.stringify(metadata),
    });
    return this.#tupleConfig(scope, checkpoint.id);
  }

  async putWrites(
    config: RunnableConfig,
    writes: PendingWrite[],
    taskId: string,
  ): Promise<void> {
    const scope = this.#scope(config);
    const checkpointId = config.configurable?.checkpoint_id as unknown;
    if (typeof checkpointId !== 'string' || !checkpointId) {
      throw new CheckpointServiceError('putWrites requires a checkpoint_id');
    }
    const rows = await Promise.all(
      writes.map(async ([channel, value], index) => {
        const [type, serialized] = await this.serde.dumpsTyped(value);
        return {
          // Sentinel channels (error/interrupt/resume) use fixed negative
          // indices so they never collide with task writes at 0..n.
          idx: WRITES_IDX_MAP[channel] ?? index,
          channel,
          type,
          value: toBase64(serialized),
        };
      }),
    );
    if (rows.length === 0) return;
    await this.#request('/v1/checkpoints/put-writes', {
      ...scope,
      checkpointId,
      taskId,
      // Sentinel-only batches overwrite previous markers (a later resume
      // supersedes an earlier one); task writes stay idempotent on retry.
      replace: writes.every(([channel]) => channel in WRITES_IDX_MAP),
      writes: rows,
    });
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.#request('/v1/checkpoints/delete-thread', { threadId });
  }
}
