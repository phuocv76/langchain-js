'use client';

// Libs for third party
import { useAgent, useCopilotKit } from '@copilotkit/react-core/v2';
import { useState } from 'react';

// Internal
import { SUGGESTED_PROMPTS } from '@repo/shared';
import { cn } from '@repo/ui/cn';
import { AGENT_ID } from '@/lib/config';

/**
 * Starter prompt chips.
 *
 * Clicking one appends a user message to the agent conversation and runs it via
 * `copilotkit.runAgent` — the same entry point CopilotChat uses internally, so
 * the message and streamed reply appear in the chat.
 */
export const SuggestedPrompts = (): React.JSX.Element => {
  const { agent } = useAgent({ agentId: AGENT_ID });
  const { copilotkit } = useCopilotKit();
  const [sending, setSending] = useState(false);

  const send = async (message: string): Promise<void> => {
    if (sending) {
      return;
    }
    setSending(true);
    try {
      agent.addMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: message,
      });
      await copilotkit.runAgent({ agent });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {SUGGESTED_PROMPTS.map((prompt) => (
        <button
          key={prompt.title}
          type="button"
          disabled={sending}
          onClick={() => void send(prompt.message)}
          className={cn(
            'rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {prompt.title}
        </button>
      ))}
    </div>
  );
};
