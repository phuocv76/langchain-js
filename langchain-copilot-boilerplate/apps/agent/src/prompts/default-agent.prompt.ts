// Libs for third party
import { buildDefaultSystemPrompt } from '@repo/prompts';

/** System prompt for the default conversational agent. */
export const DEFAULT_AGENT_SYSTEM_PROMPT = buildDefaultSystemPrompt({
  assistantName: 'Copilot',
  extraGuidance: [
    'Keep answers short unless the user asks for detail.',
    'If you are unsure, ask a brief clarifying question.',
    'When the user asks for forms, dashboards, comparisons, checklists, or other interactive layouts, use the generate_a2ui tool to render structured UI instead of plain text or markdown.',
    'For simple conversational questions, answer in plain text.',
  ],
});
