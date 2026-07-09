/**
 * Shared, framework-agnostic types used across the agent and web apps.
 * Keep this package free of runtime dependencies so it can be imported anywhere.
 */

/** Role of a single chat message. */
export type ChatRole = 'user' | 'assistant' | 'system' | 'tool';

/** A minimal, transport-friendly chat message shape. */
export interface ChatMessage {
  readonly id: string;
  readonly role: ChatRole;
  readonly content: string;
  readonly createdAt: string;
}

/** Theme options controllable by the client Theme Agent. */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Session context forwarded to the graph via CopilotKit `configurable`. */
export interface AgentSessionContext {
  readonly userId?: string;
  readonly userName?: string;
  readonly locale?: string;
  readonly [key: string]: unknown;
}

/** Authenticated application user shared with the agent as CopilotKit state. */
export interface AgentUserProfile {
  readonly userId: string;
  readonly userName: string;
  readonly userEmail?: string;
}

/** Request body for the plain `POST /chat` endpoint. */
export interface ChatRequest {
  readonly message: string;
  readonly threadId?: string;
  readonly context?: AgentSessionContext;
}

/** Generic success/error envelope for REST responses. */
export type ApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly error: string };

/** Health check payload. */
export interface HealthStatus {
  readonly status: 'ok';
  readonly service: string;
  readonly uptimeSeconds: number;
}
