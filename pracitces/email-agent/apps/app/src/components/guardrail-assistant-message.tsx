// Internal
import {
  createCustomAssistantMessage,
  renderGuardrailOrMarkdown,
} from "@/components/custom-assistant-message";
import { useResolvedAssistantMessage } from "@/hooks/use-resolved-assistant-message";

// Types
import type { AssistantSlotProps } from "@/types/copilot-assistant-message";

interface GuardrailAssistantMessageBodyProps {
  readonly slotProps: AssistantSlotProps;
}

/** Renders guardrail replies as a card; otherwise uses default markdown. */
const GuardrailAssistantMessageBody = ({
  slotProps,
}: GuardrailAssistantMessageBodyProps): React.JSX.Element => {
  const { content, messageId } = useResolvedAssistantMessage(slotProps.message);

  return renderGuardrailOrMarkdown({
    content,
    messageId,
    slotProps,
  });
};

/** Assistant message renderer with shared out-of-scope styling. */
export const GuardrailAssistantMessage = createCustomAssistantMessage(
  (slotProps) => <GuardrailAssistantMessageBody slotProps={slotProps} />,
);
