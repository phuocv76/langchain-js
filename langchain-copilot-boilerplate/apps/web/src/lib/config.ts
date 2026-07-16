// Libs for third party
import { DEFAULT_AGENT_ID } from '@repo/shared';

/** Agent id — must match a graph registered in apps/agent/langgraph.json. */
export const AGENT_ID: string =
  process.env.NEXT_PUBLIC_AGENT_ID ?? DEFAULT_AGENT_ID;

/**
 * CopilotKit runtime hosted by the agent service. The browser calls it
 * directly (CORS) with the signed-in user's Firebase ID token — there is no
 * Next.js proxy layer.
 */
export const COPILOT_RUNTIME_URL: string =
  process.env.NEXT_PUBLIC_COPILOT_RUNTIME_URL ??
  'http://localhost:4000/copilotkit';

/**
 * Base URL of the agent's REST endpoints (/memory, /health). Same host as
 * the CopilotKit runtime, so it is derived instead of adding another env var.
 */
export const AGENT_API_URL: string = COPILOT_RUNTIME_URL.replace(
  /\/copilotkit\/?$/,
  '',
);
