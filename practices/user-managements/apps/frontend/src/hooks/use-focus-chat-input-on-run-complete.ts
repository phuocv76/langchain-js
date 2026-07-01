// Libs for third party
import { useAgent } from '@copilotkit/react-core/v2';
import { useEffect, useRef } from 'react';

const CHAT_INPUT_SELECTOR =
  '.chat-main [data-testid="copilot-chat-input"] textarea';

/**
 * Focuses the CopilotKit chat textarea when an agent run finishes.
 *
 * @param agentId - CopilotKit agent id for the active chat.
 * @param enabled - When false, skips auto-focus (e.g. read-only threads).
 */
export const useFocusChatInputOnRunComplete = (
  agentId: string,
  enabled = true,
): void => {
  const { agent } = useAgent({ agentId });
  const wasRunningRef = useRef(agent.isRunning);

  useEffect(() => {
    const wasRunning = wasRunningRef.current;
    wasRunningRef.current = agent.isRunning;

    if (!enabled || !wasRunning || agent.isRunning) {
      return;
    }

    const focusInput = (): void => {
      document
        .querySelector<HTMLTextAreaElement>(CHAT_INPUT_SELECTOR)
        ?.focus({ preventScroll: true });
    };

    requestAnimationFrame(focusInput);
  }, [agent.isRunning, enabled]);
};
