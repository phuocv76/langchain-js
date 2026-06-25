interface AssistantMessageFrameProps {
  readonly messageId: string;
  readonly className?: string;
  readonly children: React.ReactNode;
  readonly toolCallsView?: React.ReactNode;
  readonly toolbar?: React.ReactNode;
  readonly toolbarVisible?: boolean;
}

/** Shared CopilotKit assistant message wrapper for custom renderers. */
export const AssistantMessageFrame = ({
  messageId,
  className,
  children,
  toolCallsView,
  toolbar,
  toolbarVisible,
}: AssistantMessageFrameProps): React.JSX.Element => {
  return (
    <div
      data-copilotkit
      data-testid="copilot-assistant-message"
      className={className}
      data-message-id={messageId}
    >
      {children}
      {toolCallsView}
      {toolbarVisible ? toolbar : null}
    </div>
  );
};
