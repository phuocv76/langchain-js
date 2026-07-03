// Internal
import { AssistantMessageFrame } from '@/components/chat/messages/assistant-message-frame';
import { createCustomAssistantMessage } from '@/components/chat/messages/custom-assistant-message';
import { ToolResultsPanel } from '@/components/tool-display/tool-results-panel';
import { useResolvedAssistantMessage } from '@/hooks/use-resolved-assistant-message';
import {
  extractToolResultsFromState,
  turnReferencesTool,
} from '@/lib/tool-results-from-state';

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

  // When the current turn involves a directory listing, show only the table
  // and drop the assistant prose so the UI stays clean and easy to scan. We
  // detect this via `turnReferencesTool`, which matches the pending AI tool
  // call (not just the completed result) so the summary text never flashes in
  // before the tool finishes — and we also match the message's own tool calls.
  const messageListsUsers = (slotProps.message.toolCalls ?? []).some(
    (call) => (call as { name?: string }).name === 'list_users',
  );
  const turnHasUsersTable =
    messageListsUsers || turnReferencesTool(stateSnapshot, 'list_users');
  const showMarkdown = content.trim().length > 0 && !turnHasUsersTable;

  if (!showMarkdown && !showToolResults && !hasToolCalls) {
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
      {showMarkdown ? (
        <div className="assistant-markdown">{slotProps.markdownRenderer}</div>
      ) : null}
    </AssistantMessageFrame>
  );
};

/** CopilotKit assistant message with user-management tool cards. */
export const UserManagementAssistantMessage = createCustomAssistantMessage(
  (slotProps) => <UserManagementAssistantBody slotProps={slotProps} />,
);
