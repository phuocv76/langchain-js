'use client';

// Libs for third party
import { useCopilotContext } from '@copilotkit/react-core';
import { CopilotChat, useAgent } from '@copilotkit/react-core/v2';
import type { ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

// Internal
import { SuggestedPrompts } from '@/components/chat/suggested-prompts';
import { D1History } from '@/components/chat/d1-history';
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
 * CopilotKit owns the active streaming run, while D1 transcript history is
 * rendered above it. Changing `threadId` selects a D1-backed conversation.
 */
export const ChatView = (): React.JSX.Element => {
  const { threadId } = useCopilotContext();
  const { agent } = useAgent({ agentId: AGENT_ID });
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const wasRunning = useRef(false);

  useEffect(() => {
    if (wasRunning.current && !agent.isRunning) {
      setHistoryRefreshKey((key) => key + 1);
    }
    wasRunning.current = agent.isRunning;
  }, [agent.isRunning]);

  return (
    <div className="mx-auto h-full w-full max-w-3xl px-4 py-6">
      <D1History threadId={threadId} refreshKey={historyRefreshKey} />
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
