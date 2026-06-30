export type InterruptAction = 'approve' | 'edit' | 'reject';

/**
 * Resolves a LangGraph human-in-the-loop interrupt with a standard action payload.
 *
 * @param resolve - CopilotKit interrupt resolver.
 * @param action - User-selected review action.
 */
export const resolveInterrupt = (
  resolve: (value: string) => void,
  action: InterruptAction,
): void => {
  if (action === 'approve') {
    resolve(JSON.stringify({ action: 'approve' }));
    return;
  }

  if (action === 'reject') {
    resolve(JSON.stringify({ action: 'reject' }));
    return;
  }

  resolve(JSON.stringify({ action: 'edit' }));
};
