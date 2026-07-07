/** A single suggested prompt rendered as a starter chip in the chat UI. */
export interface SuggestedPrompt {
  readonly title: string;
  readonly message: string;
}

/**
 * Starter prompts shown in the empty chat state.
 *
 * The first two exercise the client Theme Agent; the last two are placeholders
 * that demonstrate how future server-side tools would surface here.
 */
export const SUGGESTED_PROMPTS: readonly SuggestedPrompt[] = [
  { title: 'Change theme to dark', message: 'Change theme to dark' },
  { title: 'Change theme to light', message: 'Change theme to light' },
  { title: 'Deactivate user', message: 'Deactivate user' },
  { title: 'Create a project', message: 'Create a project' },
];
