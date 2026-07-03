interface AssistantMessageFrameProps {
  readonly messageId: string;
  readonly className?: string;
  readonly children: React.ReactNode;
  readonly toolCallsView?: React.ReactNode;
  readonly toolbar?: React.ReactNode;
  readonly toolbarVisible?: boolean;
}

/** Shared CopilotKit assistant message wrapper. */
export const AssistantMessageFrame = ({
  messageId,
  className,
  children,
  toolCallsView,
  toolbar,
  toolbarVisible,
}: AssistantMessageFrameProps): React.JSX.Element => (
  <div
    data-copilotkit
    data-testid="copilot-assistant-message"
    className={className}
    data-message-id={messageId}
  >
    {children}
    <div className="tool-results-default tool-results-default--hidden">
      {toolCallsView}
    </div>
    {toolbarVisible ? toolbar : null}
  </div>
);
