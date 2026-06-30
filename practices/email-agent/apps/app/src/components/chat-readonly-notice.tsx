/** Shown instead of the composer when viewing a historical thread. */
export const ChatReadOnlyNotice = (): React.JSX.Element => {
  return (
    <div className="chat-readonly-notice" data-testid="chat-readonly-notice">
      <p className="chat-readonly-notice__text">
        This is a saved conversation. Actions are disabled — click{' '}
        <strong>New chat</strong> to start a fresh thread.
      </p>
    </div>
  );
};
