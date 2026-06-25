// Internal
import { AssistantMessageFrame } from "@/components/assistant-message-frame";
import {
  createCustomAssistantMessage,
  renderGuardrailOrMarkdown,
} from "@/components/custom-assistant-message";
import { NewsSummaryCard } from "@/components/news-summary-card";
import { useResolvedAssistantMessage } from "@/hooks/use-resolved-assistant-message";
import { parseNewsSummary } from "@/lib/news/summary";

// Types
import type { AssistantSlotProps } from "@/types/copilot-assistant-message";

interface NewsSummaryMessageBodyProps {
  readonly slotProps: AssistantSlotProps;
}

/** Resolves structured output from the current assistant message only. */
const NewsSummaryMessageBody = ({
  slotProps,
}: NewsSummaryMessageBodyProps): React.JSX.Element => {
  const { content, messageId, stateSnapshot } = useResolvedAssistantMessage(
    slotProps.message,
  );
  const summary = parseNewsSummary(content, stateSnapshot);

  if (!summary) {
    return renderGuardrailOrMarkdown({
      content,
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
