/**
 * Maps useThreads errors to a short sidebar hint.
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
      return 'Session-only chat history. Configure CopilotKit Intelligence to persist threads.';
    }
    return 'Chat history unavailable. Try refreshing the page.';
  }
  return message;
};
