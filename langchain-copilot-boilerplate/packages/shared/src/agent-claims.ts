/**
 * Wire contract for verified identity between the BFF auth middleware, the
 * embedded LangGraph runtime, and graph middleware: `requireAgentUser`
 * verifies the Firebase token and sets these headers, the embed app copies
 * them into `config.configurable` on every run creation, and graph
 * middleware reads them back from there.
 */

export const AGENT_HEADER_REQUEST_ID = 'x-agent-request-id';
export const AGENT_HEADER_USER_ID = 'x-agent-user-id';
export const AGENT_HEADER_USER_EMAIL = 'x-agent-user-email';
export const AGENT_HEADER_ROLES = 'x-agent-roles';
export const AGENT_HEADER_ACCESS_TOKEN = 'x-agent-access-token';

/** Every claim header, in the order the auth middleware sets them. */
export const AGENT_CLAIM_HEADERS = [
  AGENT_HEADER_REQUEST_ID,
  AGENT_HEADER_USER_ID,
  AGENT_HEADER_USER_EMAIL,
  AGENT_HEADER_ROLES,
  AGENT_HEADER_ACCESS_TOKEN,
] as const;

/**
 * Prefix reserved for verified claims. Keys with this prefix arriving in a
 * client-supplied run config are always dropped before the verified values
 * are injected — identity never comes from a request body.
 */
export const AGENT_CLAIM_PREFIX = 'x-agent-';

export interface AgentUserContext {
  readonly requestId: string;
  readonly userId: string;
  /** Verified email — the product API keys users by it. */
  readonly email: string;
  readonly roles: readonly string[];
}

/**
 * Verified identity plus the Firebase ID token for product-API Bearer auth.
 * Built from the sanitized claim headers after `requireAgentUser`.
 */
export interface AgentRunIdentity extends AgentUserContext {
  readonly accessToken: string;
}
