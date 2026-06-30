// Libs for third party
import { CopilotChat } from '@copilotkit/react-core/v2';
import { useMemo } from 'react';

// Internal
import { UserManagementAssistantMessage } from '@/components/user-management-assistant-message';
import { AGENT_ID, MESSAGES } from '@/lib/constants/messages';
import { useChatSession } from '@/providers/chat-session';

interface UserManagementChatProps {
  readonly sessionKey: number;
  readonly threadId: string | undefined;
}

/** CopilotKit chat with custom tool cards and thread support. */
export const UserManagementChat = ({
  sessionKey,
  threadId,
}: UserManagementChatProps): React.JSX.Element => {
  const { isHistoricalThread } = useChatSession();

  const messageView = useMemo(
    () => ({ assistantMessage: UserManagementAssistantMessage }),
    [],
  );

  return (
    <CopilotChat
      key={`${AGENT_ID}-${sessionKey}-${threadId ?? 'new'}`}
      agentId={AGENT_ID}
      threadId={threadId}
      messageView={messageView}
      labels={{
        welcomeMessageText:
          'Ask about user profiles, directory listings, or account updates.',
        chatInputPlaceholder: isHistoricalThread
          ? 'Read-only — start a new chat to continue'
          : 'e.g. List all users or find user by email…',
        modalHeaderTitle: MESSAGES.APP_TITLE,
      }}
    />
  );
};
