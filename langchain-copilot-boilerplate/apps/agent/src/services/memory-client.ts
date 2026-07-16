// Internal
import { env } from '@agent/config/env.js';

export interface MemoryIdentity {
  readonly requestId: string;
  readonly userId: string;
  readonly threadId: string;
}

export interface MemoryTurn extends MemoryIdentity {
  readonly role: 'user' | 'assistant' | 'tool';
  readonly content: string;
  /** Engine-assigned chat message id; lets history reads dedupe against live runs. */
  readonly messageId?: string;
  readonly toolMetadata?: unknown;
}

class MemoryServiceError extends Error {
  override name = 'MemoryServiceError';
}

const isConfigured = (): boolean => Boolean(env.MEMORY_WORKER_URL);

/**
 * The Cloudflare Access service-token pair is only needed to cross the
 * Access boundary in front of a deployed worker; local `wrangler dev`
 * is reached directly, so the headers are attached only when configured.
 */
const accessHeaders = (): Record<string, string> =>
  env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET
    ? {
        'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID,
        'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET,
      }
    : {};

const requestMemoryService = async <T>(
  path: string,
  method: 'POST' | 'DELETE',
  body: unknown,
): Promise<T | undefined> => {
  if (!isConfigured()) return undefined;

  const response = await fetch(`${env.MEMORY_WORKER_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...accessHeaders(),
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
