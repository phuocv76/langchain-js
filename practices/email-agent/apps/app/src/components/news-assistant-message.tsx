// Internal
import { AssistantMessageFrame } from "@/components/assistant-message-frame";
import {
  createCustomAssistantMessage,
  renderGuardrailOrMarkdown,
} from "@/components/custom-assistant-message";
import { NewsSummaryCard } from "@/components/news-summary-card";
import { useResolvedAssistantMessage } from "@/hooks/use-resolved-assistant-message";
import { parseNewsSummary } from "@/lib/news/summary";
import { stringifyMessageContent } from "@/lib/threads/title";

// Types
import type { AssistantSlotProps } from "@/types/copilot-assistant-message";

interface NewsSummaryMessageBodyProps {
  readonly slotProps: AssistantSlotProps;
}

/** Renders a news card only when this message carries the structured summary. */
const NewsSummaryMessageBody = ({
  slotProps,
}: NewsSummaryMessageBodyProps): React.JSX.Element | null => {
  const rawContent = stringifyMessageContent(slotProps.message.content);
  const { content: resolvedContent, messageId } = useResolvedAssistantMessage(
    slotProps.message,
  );
  const summary = parseNewsSummary(rawContent);

  if (!summary) {
    if (!rawContent.trim()) {
      if (slotProps.toolCallsView) {
        return (
          <AssistantMessageFrame
            messageId={messageId}
            className="copilotKitMessage copilotKitAssistantMessage"
            toolCallsView={slotProps.toolCallsView}
            toolbar={slotProps.toolbar}
            toolbarVisible={slotProps.toolbarVisible}
          >
            {null}
          </AssistantMessageFrame>
        );
      }

      return null;
    }

    return renderGuardrailOrMarkdown({
      content: resolvedContent,
      messageId,
      slotProps,
    });
  }

  return (
    <AssistantMessageFrame
      messageId={messageId}
      className="copilotKitMessage copilotKitAssistantMessage news-summary-message"
      toolCallsView={slotProps.toolCallsView}
      toolbar={slotProps.toolbar}
      toolbarVisible={slotProps.toolbarVisible}
    >
      <NewsSummaryCard summary={summary} />
    </AssistantMessageFrame>
  );
};

/** Renders structured news summaries as a card instead of raw JSON. */
export const NewsAssistantMessage = createCustomAssistantMessage(
  (slotProps) => <NewsSummaryMessageBody slotProps={slotProps} />,
);
