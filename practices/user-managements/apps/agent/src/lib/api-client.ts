// Libs for third party
import type { RunnableConfig } from '@langchain/core/runnables';

/** Session context passed from CopilotKit / BFF via LangGraph configurable. */
export interface AgentSessionContext {
  readonly userId: string;
  readonly userRole: 'admin' | 'member';
  readonly userName: string;
  readonly sessionToken?: string;
}

const DEFAULT_API_URL = 'http://localhost:4000';

/**
 * Reads agent session context from LangGraph runnable config.
 *
 * @param config - LangGraph runnable config from tool invocation.
 */
export const readSessionContext = (
  config?: RunnableConfig,
): AgentSessionContext => {
  const cfg = config?.configurable ?? {};
  return {
    userId: String(cfg.userId ?? 'a0000000-0000-4000-8000-000000000001'),
    userRole: cfg.userRole === 'member' ? 'member' : 'admin',
    userName: String(cfg.userName ?? 'Admin'),
    sessionToken:
      typeof cfg.sessionToken === 'string' ? cfg.sessionToken : undefined,
  };
};

/**
 * Returns the user REST API base URL.
 *
 * @param config - Optional LangGraph config (falls back to env).
 */
export const readApiBaseUrl = (config?: RunnableConfig): string =>
  String(
    config?.configurable?.apiBaseUrl ??
      process.env.USER_API_URL ??
      DEFAULT_API_URL,
  );

/**
 * Performs an authenticated fetch against the user management REST API.
 *
 * @param config - LangGraph runnable config with session context.
 * @param path - API path (e.g. `/api/users`).
 * @param init - Optional fetch init.
 */
export const apiFetch = async (
  config: RunnableConfig | undefined,
  path: string,
  init?: RequestInit,
): Promise<Response> => {
  const baseUrl = readApiBaseUrl(config);
  const session = readSessionContext(config);
  const headers = new Headers(init?.headers);

  if (session.sessionToken) {
    headers.set('Cookie', `session=${session.sessionToken}`);
  } else {
    headers.set('x-dev-user-id', session.userId);
    headers.set('x-dev-user-role', session.userRole);
  }

  headers.set('Content-Type', 'application/json');

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers,
  });
};

/**
 * Parses JSON from an API response or throws with the error body.
 *
 * @param response - Fetch response from the user API.
 */
export const parseApiJson = async <T>(response: Response): Promise<T> => {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(
      typeof body.error === 'string' ? body.error : `API ${response.status}`,
    );
  }
  return body;
};
