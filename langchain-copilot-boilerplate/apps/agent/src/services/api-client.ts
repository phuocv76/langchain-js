// Internal
import { env } from '@agent/config/env.js';

/**
 * Verified identity a tool acts on behalf of. Always sourced from the trusted
 * agent context (see durable-memory middleware) — never from model arguments,
 * so the model can never choose whose data an API call touches.
 */
export interface ActingIdentity {
  readonly requestId: string;
  readonly userId: string;
  /** Verified email — the product API keys users by it. */
  readonly email: string;
}

export class ApiClientError extends Error {
  override name = 'ApiClientError';

  constructor(
    message: string,
    /** HTTP status from the product API, if the request got that far. */
    readonly status?: number,
  ) {
    super(message);
  }
}

export interface ApiRequestOptions {
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly identity: ActingIdentity;
  readonly body?: unknown;
  readonly query?: Readonly<Record<string, string>>;
}

/** True when the product API integration is configured for this deployment. */
export const isApiConfigured = (): boolean =>
  Boolean(env.API_BASE_URL && env.API_SERVICE_TOKEN);

/**
 * Single entry point for calling the existing product REST API.
 *
 * Authenticates with the service credential and forwards the acting user as
 * headers, so the API can enforce per-user authorization while credentials
 * never enter graph state or transport. Requests are bounded by
 * `API_TIMEOUT_MS` so a slow endpoint cannot stall a chat run.
 *
 * @throws ApiClientError when unconfigured, timed out, or on a non-2xx reply.
 */
export const apiRequest = async <T>(
  path: string,
  { method = 'GET', identity, body, query }: ApiRequestOptions,
): Promise<T> => {
  if (!isApiConfigured()) {
    throw new ApiClientError(
      'Product API is not configured. Set API_BASE_URL and API_SERVICE_TOKEN.',
    );
  }

  const url = new URL(path, env.API_BASE_URL);
  for (const [key, value] of Object.entries(query ?? {})) {
    url.searchParams.set(key, value);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${env.API_SERVICE_TOKEN!}`,
        'X-Acting-User-Id': identity.userId,
        'X-Acting-User-Email': identity.email,
        'X-Request-Id': identity.requestId,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(env.API_TIMEOUT_MS),
    });
  } catch (error) {
    throw new ApiClientError(
      error instanceof Error && error.name === 'TimeoutError'
        ? `Product API request timed out after ${env.API_TIMEOUT_MS}ms`
        : 'Product API request failed',
    );
  }

  if (!response.ok) {
    throw new ApiClientError(
      `Product API returned ${response.status}`,
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
};
