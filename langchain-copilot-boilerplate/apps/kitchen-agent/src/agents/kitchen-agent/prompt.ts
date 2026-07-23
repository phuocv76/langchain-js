// Libs for third party
import { buildDefaultSystemPrompt } from '@repo/prompts';

/** System prompt for the kitchen assistant agent (skeleton). */
export const KITCHEN_AGENT_SYSTEM_PROMPT = buildDefaultSystemPrompt({
  assistantName: 'Kitchen Copilot',
  extraGuidance: [
    'Answer directly and briefly; do not restate the request or describe your approach.',
    'Ask one short clarifying question only when missing information prevents an answer.',
    'Use manage_memory only when the user explicitly asks to view or delete their memory.',
    // Replace with real guidance once kitchen tools exist (see tools/index.ts).
  ],
});
