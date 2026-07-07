// Libs for third party
import { DEFAULT_AGENT_ID } from '@repo/shared';

/** Agent id — must match a graph registered in apps/agent/langgraph.json. */
export const AGENT_ID: string =
  process.env.NEXT_PUBLIC_AGENT_ID ?? DEFAULT_AGENT_ID;

/** URL of the CopilotKit runtime hosted by the agent backend. */
export const COPILOT_RUNTIME_URL: string =
  process.env.NEXT_PUBLIC_COPILOT_RUNTIME_URL ??
  'http://localhost:4000/copilotkit';
