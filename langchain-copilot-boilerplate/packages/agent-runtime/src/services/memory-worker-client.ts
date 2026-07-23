// Internal
import { env } from '../config/env.js';

/** Failure from the memory worker HTTP surface; carries the response status. */
export class MemoryWorkerError extends Error {
  override name = 'MemoryWorkerError';

  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
  }
}

/**
 * The Cloudflare Access service-token pair is only needed to cross the
 * Access boundary in front of a deployed worker; local `wrangler dev`
 * is reached directly, so the headers are attached only when configured.
 */
export const accessHeaders = (): Record<string, string> =>
  env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET
    ? {
        'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID,
        'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET,
      }
    : {};

/**
 * Bound every worker round-trip: checkpoint persistence sits on the chat
 * run's critical path, so a hung worker must fail the run promptly instead
 * of stalling it forever. Generous enough for multi-MB checkpoint payloads.
 */
const DEFAULT_TIMEOUT_MS = 15_000;

export interface MemoryWorkerRequest {
  readonly baseUrl: string;
  readonly path: string;
  readonly body: unknown;
  readonly method?: 'POST' | 'DELETE';
  /** Extra request headers; defaults to the Cloudflare Access pair. */
  readonly headers?: Record<string, string>;
  /** Label used in error messages, e.g. "Checkpoint service". */
  readonly context?: string;
  readonly timeoutMs?: number;
}

/** Single JSON-over-HTTP entry point to the memory worker. */
export const requestMemoryWorker = async <T>({
  baseUrl,
  path,
  body,
  method = 'POST',
  headers = accessHeaders(),
  context = 'Memory worker',
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: MemoryWorkerRequest): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new MemoryWorkerError(
      error instanceof Error && error.name === 'TimeoutError'
        ? `${context} ${path} timed out after ${timeoutMs}ms`
        : `${context} ${path} request failed`,
    );
  }
  if (!response.ok) {
    throw new MemoryWorkerError(
      `${context} ${path} returned ${response.status}`,
      response.status,
    );
  }
  return (await response.json()) as T;
};
