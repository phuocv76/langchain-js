/**
 * Maps useThreads errors to a short, actionable sidebar hint.
 *
 * @param message - Error message from CopilotKit.
 * @param runtimeMode - CopilotKit runtime mode when the error occurred.
 */
export const formatThreadError = (
  message: string,
  runtimeMode?: string,
): string => {
  if (message.includes('Thread endpoints are not available')) {
    if (runtimeMode !== 'intelligence') {
      return (
        'Session-only chat history (no cloud save). To persist conversations, run ' +
        '`npx copilotkit@latest project select` and add the INTELLIGENCE_* vars to .env.'
      );
    }

    return 'Chat history is unavailable. Try a hard refresh (Cmd+Shift+R).';
  }

  if (message.includes('Failed to list threads')) {
    return (
      'Could not load saved conversations. Run `npx copilotkit@latest project select` ' +
      'in the repo root, add the INTELLIGENCE_API_URL, INTELLIGENCE_GATEWAY_WS_URL, ' +
      'and INTELLIGENCE_API_KEY values it writes to .env, then restart pnpm dev.'
    );
  }

  return message;
};
