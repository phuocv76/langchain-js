/** Whether the web app has a CopilotKit public license key for Intelligence features. */
const COPILOT_PUBLIC_LICENSE_KEY =
  process.env.NEXT_PUBLIC_COPILOTKIT_PUBLIC_LICENSE_KEY?.trim();

export const isCopilotIntelligenceConfiguredOnWeb = (): boolean =>
  Boolean(COPILOT_PUBLIC_LICENSE_KEY);
