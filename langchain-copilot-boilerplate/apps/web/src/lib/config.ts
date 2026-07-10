// Libs for third party
import { DEFAULT_AGENT_ID } from '@repo/shared';

/** Agent id — must match a graph registered in apps/agent/langgraph.json. */
export const AGENT_ID: string =
  process.env.NEXT_PUBLIC_AGENT_ID ?? DEFAULT_AGENT_ID;

/** URL of the CopilotKit runtime hosted by the agent backend. */
export const COPILOT_RUNTIME_URL: string =
  process.env.NEXT_PUBLIC_COPILOT_RUNTIME_URL ?? '/api/copilotkit';

/**
 * Public license key for Enterprise Intelligence features (thread history,
 * realtime sync). Get one at https://dashboard.operations.copilotkit.ai
 */
const rawCopilotPublicLicenseKey =
  process.env.NEXT_PUBLIC_COPILOTKIT_PUBLIC_LICENSE_KEY?.trim();

export const COPILOT_PUBLIC_LICENSE_KEY: string | undefined =
  rawCopilotPublicLicenseKey?.startsWith('ck_pub_')
    ? rawCopilotPublicLicenseKey
    : undefined;
