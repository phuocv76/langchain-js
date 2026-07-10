/** A single suggested prompt rendered as a starter chip in the chat UI. */
export interface SuggestedPrompt {
  readonly title: string;
  readonly message: string;
}

/**
 * Starter prompts shown in the empty chat state.
 *
 * The first two exercise the client Theme Agent; the third triggers A2UI
 * generative UI; the last is a placeholder for future server-side tools.
 */
export const SUGGESTED_PROMPTS: readonly SuggestedPrompt[] = [
  { title: 'Change theme to dark', message: 'Change theme to dark' },
  { title: 'Change theme to light', message: 'Change theme to light' },
  {
    title: 'Build project form',
    message:
      'Build an interactive form to create a new project with name and description fields.',
  },
  { title: 'Deactivate user', message: 'Deactivate user' },
];
