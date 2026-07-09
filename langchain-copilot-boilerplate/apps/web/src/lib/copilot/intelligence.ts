// Internal
import { COPILOT_PUBLIC_LICENSE_KEY } from '@/lib/config';

export const isCopilotIntelligenceConfiguredOnWeb = (): boolean =>
  Boolean(COPILOT_PUBLIC_LICENSE_KEY);
