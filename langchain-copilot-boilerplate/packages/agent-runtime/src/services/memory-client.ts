// Internal
import type { MemoryIdentity, MemoryTurn } from '@repo/shared';
import { env } from '../config/env.js';
import { requestMemoryWorker } from './memory-worker-client.js';

export type { MemoryIdentity, MemoryTurn };

/**
 * Durable memory is an enhancement layer: when MEMORY_WORKER_URL is unset
 * every operation is a silent no-op, so the chat works without the worker.
 */
const requestMemoryService = async <T>(
  path: string,
  method: 'POST' | 'DELETE',
  body: unknown,
): Promise<T | undefined> => {
  if (!env.MEMORY_WORKER_URL) return undefined;
  return requestMemoryWorker<T>({
    baseUrl: env.MEMORY_WORKER_URL,
    path,
    body,
    method,
    context: 'Memory service',
  });
};

export const appendMemoryTurn = async (
  turn: MemoryTurn,
): Promise<{ id: string; isNewThread: boolean } | undefined> => {
  const result = await requestMemoryService<{ id: string; isNewThread?: boolean }>(
    '/v1/turns',
    'POST',
    turn,
  );
  if (!result?.id) return undefined;
  return { id: result.id, isNewThread: result.isNewThread === true };
};

export const retrieveMemory = async (
  identity: MemoryIdentity,
  query: string,
): Promise<string[]> => {
  const result = await requestMemoryService<{
    semanticTurns: Array<{ content: string }>;
    recentTurns: Array<{ content: string }>;
  }>('/v1/retrieve', 'POST', { ...identity, query });
  if (!result) return [];
  return [...result.semanticTurns, ...result.recentTurns]
    .map((turn) => turn.content.replace(/\p{Cc}/gu, ' ').trim())
    .filter(Boolean)
    .slice(0, 10)
    .map((content) => content.slice(0, 800));
};

/**
 * Deletes the whole thread scope — transcript turns, titles, engine
 * checkpoints, and platform thread metadata — in one atomic worker batch.
 */
export const deleteMemoryThread = async (identity: MemoryIdentity): Promise<void> => {
  await requestMemoryService('/v1/threads', 'DELETE', identity);
};

export const renameMemoryThread = async (
  identity: MemoryIdentity,
  title: string,
): Promise<void> => {
  await requestMemoryService('/v1/threads/rename', 'POST', { ...identity, title });
};

export interface MemoryTurnRecord {
  readonly id: string;
  readonly role: string;
  readonly content: string;
  readonly message_id: string | null;
  readonly created_at: string;
}

export const listMemoryThread = async (
  identity: MemoryIdentity,
): Promise<readonly MemoryTurnRecord[]> => {
  const result = await requestMemoryService<{ turns: MemoryTurnRecord[] }>(
    '/v1/turns/list',
    'POST',
    identity,
  );
  return result?.turns ?? [];
};

export const listMemoryThreads = async (
  identity: MemoryIdentity,
): Promise<readonly { thread_id: string; title: string | null; updated_at: string }[]> => {
  const result = await requestMemoryService<{
    threads: Array<{ thread_id: string; title: string | null; updated_at: string }>;
  }>('/v1/threads/list', 'POST', identity);
  return result?.threads ?? [];
};

export const deleteMemoryUser = async (identity: MemoryIdentity): Promise<void> => {
  await requestMemoryService('/v1/users', 'DELETE', identity);
};
