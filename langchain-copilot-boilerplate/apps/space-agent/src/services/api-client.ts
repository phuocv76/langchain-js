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
  /** Verified email — used when a tool omits an explicit employee email. */
  readonly email: string;
  /**
   * Verified Firebase ID token. Presented to the product API as
   * `Authorization: Bearer` so the API can identify the signed-in user and
   * enforce permissions. Read from run configurable — never from graph state.
   */
  readonly accessToken: string;
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

/** True when the product API base URL is configured for this deployment. */
export const isApiConfigured = (): boolean => Boolean(env.API_BASE_URL);

/**
 * Single entry point for calling the existing product REST API.
 *
 * Authenticates with the signed-in user's Firebase ID token as
 * `Authorization: Bearer`, matching the API's normal user auth. Requests are
 * bounded by `API_TIMEOUT_MS` so a slow endpoint cannot stall a chat run.
 *
 * @throws ApiClientError when unconfigured, timed out, or on a non-2xx reply.
 */
export const apiRequest = async <T>(
  path: string,
  { method = 'GET', identity, body, query }: ApiRequestOptions,
): Promise<T> => {
  if (!isApiConfigured()) {
    throw new ApiClientError(
      'Product API is not configured. Set API_BASE_URL.',
    );
  }

  if (!identity.accessToken) {
    throw new ApiClientError(
      'Missing verified access token for product API request',
      401,
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
        Authorization: `Bearer ${identity.accessToken}`,
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
