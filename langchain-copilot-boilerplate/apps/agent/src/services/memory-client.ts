// Internal
import { env } from '@agent/config/env.js';

export interface MemoryIdentity {
  readonly requestId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly threadId: string;
}

export interface MemoryTurn extends MemoryIdentity {
  readonly role: 'user' | 'assistant' | 'tool';
  readonly content: string;
  readonly toolMetadata?: unknown;
}

export class MemoryServiceError extends Error {
  override name = 'MemoryServiceError';
}

const isConfigured = (): boolean =>
  Boolean(
    env.MEMORY_SERVICE_URL && env.MEMORY_INTERNAL_SECRET,
  );

const requestMemoryService = async <T>(
  path: string,
  method: 'POST' | 'DELETE',
  body: unknown,
): Promise<T | undefined> => {
  if (!isConfigured()) return undefined;

  const response = await fetch(`${env.MEMORY_SERVICE_URL}/internal/memory${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-memory-internal-secret': env.MEMORY_INTERNAL_SECRET!,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new MemoryServiceError(`Memory service returned ${response.status}`);
  }
  return (await response.json()) as T;
};

export const appendMemoryTurn = async (
  turn: MemoryTurn,
): Promise<string | undefined> => {
  const result = await requestMemoryService<{ id: string }>('/v1/turns', 'POST', turn);
  return result?.id;
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

export const deleteMemoryThread = async (identity: MemoryIdentity): Promise<void> => {
  await requestMemoryService('/v1/threads', 'DELETE', identity);
};

export const listMemoryThread = async (
  identity: MemoryIdentity,
): Promise<readonly { id: string; role: string; content: string; created_at: string }[]> => {
  const result = await requestMemoryService<{
    turns: Array<{ id: string; role: string; content: string; created_at: string }>;
  }>('/v1/turns/list', 'POST', identity);
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
