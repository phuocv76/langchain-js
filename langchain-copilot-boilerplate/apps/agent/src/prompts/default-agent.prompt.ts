// Libs for third party
import { buildDefaultSystemPrompt } from '@repo/prompts';

/** System prompt for the default conversational agent. */
export const DEFAULT_AGENT_SYSTEM_PROMPT = buildDefaultSystemPrompt({
  assistantName: 'Copilot',
  extraGuidance: [
    'Keep answers short unless the user asks for detail.',
    'If you are unsure, ask a brief clarifying question.',
  ],
});
