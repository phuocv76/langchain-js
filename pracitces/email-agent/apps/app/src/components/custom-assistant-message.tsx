// Libs for third party
import { CopilotChatAssistantMessage } from "@copilotkit/react-core/v2";

// Internal
import { AssistantMessageFrame } from "@/components/assistant-message-frame";
import { renderGuardrailCard } from "@/components/out-of-scope-card";

// Types
import type {
  AssistantMessageProps,
  AssistantSlotProps,
} from "@/types/copilot-assistant-message";

interface RenderGuardrailOrMarkdownOptions {
  readonly content: string;
  readonly messageId: string;
  readonly slotProps: AssistantSlotProps;
  readonly className?: string;
}

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

/**
 * Renders a guardrail card or falls back to default markdown for an assistant turn.
 *
 * @param options - Resolved message content and CopilotKit slot props.
 */
export const renderGuardrailOrMarkdown = ({
  content,
  messageId,
  slotProps,
  className = "copilotKitMessage copilotKitAssistantMessage",
}: RenderGuardrailOrMarkdownOptions): React.JSX.Element => {
  const guardrailCard = renderGuardrailCard(content);

  if (guardrailCard) {
    return (
      <AssistantMessageFrame
        messageId={messageId}
        className={`${className} out-of-scope-message`}
        toolCallsView={slotProps.toolCallsView}
        toolbar={slotProps.toolbar}
        toolbarVisible={slotProps.toolbarVisible}
      >
        {guardrailCard}
      </AssistantMessageFrame>
    );
  }

  return (
    <AssistantMessageFrame
      messageId={messageId}
      className={className}
      toolCallsView={slotProps.toolCallsView}
      toolbar={slotProps.toolbar}
      toolbarVisible={slotProps.toolbarVisible}
    >
      <div className="cpk:prose cpk:max-w-full cpk:break-words cpk:dark:prose-invert">
        {slotProps.markdownRenderer}
      </div>
    </AssistantMessageFrame>
  );
};
