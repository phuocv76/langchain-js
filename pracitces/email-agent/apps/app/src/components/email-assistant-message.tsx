// Internal
import {
  createCustomAssistantMessage,
  renderGuardrailOrMarkdown,
} from '@/components/custom-assistant-message';
import { useResolvedAssistantMessage } from '@/hooks/use-resolved-assistant-message';
import { isInternalEmailAssistantContent } from '@/lib/email/assistant-content';

// Types
import type { AssistantSlotProps } from '@/types/copilot-assistant-message';

interface EmailAssistantMessageBodyProps {
  readonly slotProps: AssistantSlotProps;
}

/** Reads draft text from agent state when CopilotKit leaves message content empty. */
const resolveEmailAssistantDisplayContent = (
  content: string,
  stateSnapshot: unknown,
): string => {
  if (content.trim()) {
    return content;
  }

  const responseText = (stateSnapshot as { responseText?: string } | undefined)
    ?.responseText;

  return responseText?.trim() ?? '';
};

/** Shows draft replies and terminal messages; hides classification JSON only. */
const EmailAssistantMessageBody = ({
  slotProps,
}: EmailAssistantMessageBodyProps): React.JSX.Element | null => {
  const { content, messageId, stateSnapshot } = useResolvedAssistantMessage(
    slotProps.message,
  );
  const displayContent = resolveEmailAssistantDisplayContent(
    content,
    stateSnapshot,
  );

  if (!displayContent || isInternalEmailAssistantContent(displayContent)) {
    return null;
  }

  return renderGuardrailOrMarkdown({
    content: displayContent,
    messageId,
    slotProps,
  });
};

/** Email agent assistant renderer that suppresses internal workflow JSON. */
export const EmailAssistantMessage = createCustomAssistantMessage(
  (slotProps) => <EmailAssistantMessageBody slotProps={slotProps} />,
);
