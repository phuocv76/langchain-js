export type InterruptAction = 'approve' | 'edit' | 'reject';

/**
 * Resolves a LangGraph human-in-the-loop interrupt with a standard action payload.
 *
 * @param resolve - CopilotKit interrupt resolver.
 * @param action - User-selected review action.
 * @param editedResponse - Draft text when action is `edit`.
 */
export const resolveInterrupt = (
  resolve: (value: string) => void,
  action: InterruptAction,
  editedResponse?: string,
): void => {
  if (action === 'approve') {
    resolve(JSON.stringify({ action: 'approve' }));
    return;
  }

  if (action === 'reject') {
    resolve(JSON.stringify({ action: 'reject' }));
    return;
  }

  resolve(
    JSON.stringify({
      action: 'edit',
      editedResponse: editedResponse ?? '',
    }),
  );
};

/**
 * Resumes an interrupt so the agent regenerates the draft from reviewer feedback.
 *
 * @param resolve - CopilotKit interrupt resolver.
 * @param feedback - Natural-language revision instructions.
 */
export const resolveInterruptFeedback = (
  resolve: (value: string) => void,
  feedback: string,
): void => {
  resolve(
    JSON.stringify({
      action: 'edit',
      feedback: feedback.trim(),
    }),
  );
};
