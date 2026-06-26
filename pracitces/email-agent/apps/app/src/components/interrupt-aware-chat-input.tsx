// Libs for third party
import {
  CopilotChatInput,
  useAgent,
  useCopilotChatConfiguration,
  type CopilotChatInputProps,
} from '@copilotkit/react-core/v2';
import { useCallback } from 'react';

// Internal
import { ChatReadOnlyNotice } from '@/components/chat-readonly-notice';
import { useChatSession } from '@/providers/chat-session';
import { useInterruptFeedbackBridge } from '@/providers/interrupt-feedback-bridge';

const InterruptAwareChatInputBody = (
  inputProps: CopilotChatInputProps,
): React.JSX.Element => {
  const { isHistoricalThread } = useChatSession();
  const config = useCopilotChatConfiguration();
  const { agent } = useAgent({ agentId: config?.agentId ?? 'default' });
  const bridge = useInterruptFeedbackBridge();

  const handleSubmit = useCallback(
    (value: string): void => {
      if (isHistoricalThread) {
        return;
      }

      const trimmed = value.trim();

      if (
        bridge.isActive &&
        bridge.canAcceptChatFeedback &&
        trimmed.length > 0
      ) {
        agent.addMessage({
          id: crypto.randomUUID(),
          role: 'user',
          content: trimmed,
        });
        inputProps.onChange?.('');
        bridge.submitFeedback(trimmed);
        return;
      }

      inputProps.onSubmitMessage?.(value);
    },
    [agent, bridge, inputProps, isHistoricalThread],
  );

  if (isHistoricalThread) {
    return <ChatReadOnlyNotice />;
  }

  return (
    <CopilotChatInput {...inputProps} onSubmitMessage={handleSubmit} />
  );
};

/** Routes chat input to interrupt resume when a draft review is waiting. */
export const InterruptAwareChatInput = Object.assign(
  InterruptAwareChatInputBody,
  CopilotChatInput,
);
