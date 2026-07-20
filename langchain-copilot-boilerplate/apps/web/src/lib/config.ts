// Libs for third party
import { DEFAULT_AGENT_ID } from '@repo/shared';

/** Agent id — must match a graph registered in apps/agent. */
export const AGENT_ID: string =
  import.meta.env.VITE_AGENT_ID ?? DEFAULT_AGENT_ID;

/**
 * CopilotKit runtime hosted by the BFF. The browser calls it
 * directly (CORS) with the signed-in user's Firebase ID token — there is no
 * proxy layer.
 */
export const COPILOT_RUNTIME_URL: string =
  import.meta.env.VITE_COPILOT_RUNTIME_URL ??
  'http://localhost:4000/copilotkit';

/**
 * Base URL of the BFF REST endpoints (/memory, /health). Same host as
 * the CopilotKit runtime, so it is derived instead of adding another env var.
 */
export const AGENT_API_URL: string = COPILOT_RUNTIME_URL.replace(
  /\/copilotkit\/?$/,
  '',
);

/**
 * Cloudflare realtime worker WebSocket endpoint.
 * Example local: `ws://localhost:8789/ws`
 * Leave unset to disable cross-session sync.
 */
export const REALTIME_WS_URL: string | undefined =
  import.meta.env.VITE_REALTIME_WS_URL || undefined;
