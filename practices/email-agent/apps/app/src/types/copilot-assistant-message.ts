// Libs for third party
import type { CopilotChatAssistantMessage } from "@copilotkit/react-core/v2";

export type AssistantMessageProps = React.ComponentProps<
  typeof CopilotChatAssistantMessage
>;

export type AssistantSlotProps = Parameters<
  NonNullable<AssistantMessageProps["children"]>
>[0];
