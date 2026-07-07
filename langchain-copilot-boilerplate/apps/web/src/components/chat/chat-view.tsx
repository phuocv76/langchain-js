'use client';

// Libs for third party
import {
  CopilotChat,
  CopilotChatConfigurationProvider,
} from '@copilotkit/react-core/v2';
import type { ReactElement } from 'react';

// Internal
import { useChatHistory } from '@/components/chat/chat-history-context';
import { SuggestedPrompts } from '@/components/chat/suggested-prompts';
import { AGENT_ID } from '@/lib/config';

/** ChatGPT-style empty state: centered greeting, input, and prompt chips. */
const WelcomeScreen = ({
  input,
}: {
  input: ReactElement;
}): React.JSX.Element => (
  <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center gap-8 px-4 pb-16">
    <h1 className="text-center text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
      What can I help with?
    </h1>
    <div className="w-full">{input}</div>
    <SuggestedPrompts />
  </div>
);

/**
 * ChatGPT-style chat surface.
 *
 * A `CopilotChatConfigurationProvider` binds the chat to the active thread from
 * {@link useChatHistory}. `hasExplicitThreadId` is `false` for brand-new chats
 * (so the welcome screen shows) and `true` when an existing thread is selected
 * (so its history is loaded from the runtime). Keying `CopilotChat` by thread id
 * remounts it on switch to run the connect/welcome logic cleanly.
 */
export const ChatView = (): React.JSX.Element => {
  const { activeThreadId, isExplicit } = useChatHistory();

  return (
    <CopilotChatConfigurationProvider
      agentId={AGENT_ID}
      threadId={activeThreadId}
      hasExplicitThreadId={isExplicit}
      labels={{ chatInputPlaceholder: 'Send a message…' }}
    >
      <div className="mx-auto h-full w-full max-w-3xl px-4 py-6">
        <CopilotChat
          key={activeThreadId}
          className="h-full"
          input={{ showDisclaimer: false, autoFocus: true }}
          welcomeScreen={WelcomeScreen}
        />
      </div>
    </CopilotChatConfigurationProvider>
  );
};
