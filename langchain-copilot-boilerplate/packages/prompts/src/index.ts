/** Options for composing an agent system prompt. */
export interface SystemPromptOptions {
  /** Human-facing assistant name. */
  readonly assistantName?: string;
  /** Extra domain-specific guidance appended to the base persona. */
  readonly extraGuidance?: readonly string[];
}

const BASE_PERSONA = [
  'You are a helpful, concise AI assistant.',
  'Answer conversationally and stay on topic.',
  'When the user greets you, use the greeting tool to reply warmly.',
  'Prefer calling a tool when one is clearly suited to the request.',
];

/**
 * Builds the system prompt for the default agent.
 *
 * @param options - Optional assistant name and extra guidance lines.
 * @returns A newline-joined system prompt string.
 */
export const buildDefaultSystemPrompt = (
  options: SystemPromptOptions = {},
): string => {
  const { assistantName = 'Assistant', extraGuidance = [] } = options;

  return [
    `Your name is ${assistantName}.`,
    ...BASE_PERSONA,
    ...extraGuidance,
  ].join('\n');
};
