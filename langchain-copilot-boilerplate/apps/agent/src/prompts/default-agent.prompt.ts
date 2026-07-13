// Libs for third party
import { buildDefaultSystemPrompt } from '@repo/prompts';

/** System prompt for the default conversational agent. */
export const DEFAULT_AGENT_SYSTEM_PROMPT = buildDefaultSystemPrompt({
  assistantName: 'Copilot',
  extraGuidance: [
    'Answer directly and briefly; do not restate the request or describe your approach.',
    'Ask one short clarifying question only when missing information prevents an answer.',
    'Use the greeting tool when the user greets you.',
    'Use generate_a2ui only for requested interactive layouts; otherwise respond in plain text.',
  ],
});
