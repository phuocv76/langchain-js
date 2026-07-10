/**
 * Shared, framework-agnostic types used across the agent and web apps.
 * Keep this package free of runtime dependencies so it can be imported anywhere.
 */

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

/** Health check payload. */
export interface HealthStatus {
  readonly status: 'ok';
  readonly service: string;
  readonly uptimeSeconds: number;
}
