// Internal
import { AssistantMessageFrame } from '@/components/assistant-message-frame';
import { createCustomAssistantMessage } from '@/components/custom-assistant-message';
import { ToolResultsPanel } from '@/components/tool-display/tool-results-panel';
import { useResolvedAssistantMessage } from '@/hooks/use-resolved-assistant-message';
import { extractToolResultsFromState } from '@/lib/tool-results-from-state';

// Types
import type { AssistantSlotProps } from '@/types/copilot-assistant-message';

/** Custom assistant renderer with tool result cards. */
const UserManagementAssistantBody = ({
  slotProps,
}: {
  slotProps: AssistantSlotProps;
}): React.JSX.Element | null => {
  const { content, messageId, stateSnapshot } = useResolvedAssistantMessage(
    slotProps.message,
  );
  const toolResults = extractToolResultsFromState(stateSnapshot);
  const hasToolCalls = (slotProps.message.toolCalls?.length ?? 0) > 0;
  const showToolResults = toolResults.length > 0 && hasToolCalls;

  if (!content.trim() && !showToolResults && !hasToolCalls) {
    return null;
  }

  return (
    <AssistantMessageFrame
      messageId={messageId}
      className="copilotKitMessage copilotKitAssistantMessage"
      toolCallsView={slotProps.toolCallsView}
      toolbar={slotProps.toolbar}
      toolbarVisible={slotProps.toolbarVisible}
    >
      {showToolResults ? <ToolResultsPanel results={toolResults} /> : null}
      {content.trim() ? (
        <div className="assistant-markdown">{slotProps.markdownRenderer}</div>
      ) : null}
    </AssistantMessageFrame>
  );
};

/** CopilotKit assistant message with user-management tool cards. */
export const UserManagementAssistantMessage = createCustomAssistantMessage(
  (slotProps) => <UserManagementAssistantBody slotProps={slotProps} />,
);
