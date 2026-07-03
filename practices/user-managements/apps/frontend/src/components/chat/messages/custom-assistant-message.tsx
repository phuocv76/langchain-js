// Internal
import { CopilotChatAssistantMessage } from '@copilotkit/react-core/v2';

// Types
import type {
  AssistantMessageProps,
  AssistantSlotProps,
} from '@/types/copilot-assistant-message';

/**
 * Builds a CopilotKit assistant message component with a custom body renderer.
 *
 * @param renderBody - Slot renderer for the assistant message content.
 */
export const createCustomAssistantMessage = (
  renderBody: (slotProps: AssistantSlotProps) => React.ReactNode,
): typeof CopilotChatAssistantMessage => {
  const Component = (props: AssistantMessageProps): React.JSX.Element => (
    <CopilotChatAssistantMessage {...props}>
      {(slotProps) => renderBody(slotProps)}
    </CopilotChatAssistantMessage>
  );

  return Object.assign(Component, CopilotChatAssistantMessage);
};
