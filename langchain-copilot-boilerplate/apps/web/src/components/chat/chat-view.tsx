'use client';

// Libs for third party
import { useCopilotContext } from '@copilotkit/react-core';
import { CopilotChat } from '@copilotkit/react-core/v2';
import type { ReactElement } from 'react';

// Internal
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
 * Thread id and history loading are owned by CopilotKit via
 * {@link useCopilotContext}. Changing `threadId` (sidebar or new chat) triggers
 * `connectAgent` and loads persisted messages from the runtime.
 */
export const ChatView = (): React.JSX.Element => {
  const { threadId } = useCopilotContext();

  return (
    <div className="mx-auto h-full w-full max-w-3xl px-4 py-6">
      <CopilotChat
        key={threadId}
        agentId={AGENT_ID}
        labels={{ chatInputPlaceholder: 'Send a message…' }}
        className="h-full"
        input={{ showDisclaimer: false, autoFocus: true }}
        welcomeScreen={WelcomeScreen}
      />
    </div>
  );
};
