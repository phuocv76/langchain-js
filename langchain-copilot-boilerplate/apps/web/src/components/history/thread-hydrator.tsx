'use client';

// Libs for third party
import { useAgent } from '@copilotkit/react-core/v2';
import { useEffect } from 'react';

// Internal
import { useAuth } from '@/components/auth/auth-provider';
import { fetchHistoryMessages } from '@/lib/agent-api';
import { AGENT_ID } from '@/lib/config';

type TranscriptMessage = { readonly id: string; readonly role?: string; readonly content?: unknown };

/** Prefix langchain's summarizationMiddleware puts on its rolling summary. */
const SUMMARY_PREFIX = 'Here is a summary of the conversation to date:';

/**
 * The engine's rolling summary is stored as a user message; it is model
 * context, not something a person said, so it never belongs on screen.
 */
const isSummary = (message: TranscriptMessage): boolean =>
  message.role === 'user' &&
  typeof message.content === 'string' &&
  message.content.startsWith(SUMMARY_PREFIX);

/**
 * Restores history the current transcript is missing and hides the summary.
 * `history` is chronological and strictly predates whatever `current` kept,
 * so prepending the missing messages preserves order. Returns undefined when
 * the transcript is already complete.
 */
const mergeTranscript = <T extends TranscriptMessage>(
  history: readonly TranscriptMessage[],
  current: readonly T[],
): TranscriptMessage[] | undefined => {
  const currentIds = new Set(current.map((message) => message.id));
  const dropped = history.filter(
    (message) => !currentIds.has(message.id) && !isSummary(message),
  );
  const visible = current.filter((message) => !isSummary(message));
  if (dropped.length === 0 && visible.length === current.length) return undefined;
  return [...dropped, ...visible];
};

/**
 * Fills the live transcript from the durable D1 transcript when a history
 * thread opens empty, and keeps it complete across runs.
 *
 * The CopilotKit runtime only replays threads it still holds in process
 * memory; after a runtime restart that replay is empty. The D1 transcript
 * has every message — including ones the engine has already compacted into a
 * summary — and carries the engine-assigned message ids.
 *
 * A finished run then streams the ENGINE's message list as a snapshot that
 * replaces the transcript; after compaction that list is only the summary
 * plus the most recent messages, which would wipe the older history off the
 * screen. The subscriber below restores whatever the snapshot dropped and
 * hides the summary bubble — display only, the engine state is untouched.
 */
export const ThreadHydrator = ({
  threadId,
}: {
  readonly threadId: string;
}): null => {
  const { idToken } = useAuth();
  const { agent } = useAgent({ agentId: AGENT_ID });

  useEffect(() => {
    if (!idToken) return;
    let cancelled = false;
    let attempts = 0;
    let saved: readonly TranscriptMessage[] | null = null;

    // The chat view mounts lazily (slow on a cold page load) and resets the
    // transcript when it appears, which can wipe an early hydration; the
    // runtime's in-memory replay may also arrive with only the compacted
    // engine list. Keep verifying for a few seconds: top the transcript up
    // with whatever saved history it is missing (fetched once). The merge is
    // idempotent, so a tick after a completed merge changes nothing.
    const tick = async (): Promise<void> => {
      if (cancelled || attempts >= 8) return;
      attempts += 1;
      if (saved === null) {
        saved = await fetchHistoryMessages(idToken, threadId).catch(
          () => [],
          // Purely cosmetic hydration; the agent resumes from its
          // checkpoint regardless, so a failed load stays silent.
        );
      }
      if (cancelled) return;
      const merged = mergeTranscript(saved, agent.messages);
      if (merged) {
        agent.setMessages(merged as Parameters<typeof agent.setMessages>[0]);
      }
      timer = setTimeout(() => void tick(), 500);
    };

    let timer = setTimeout(() => void tick(), 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [idToken, threadId, agent]);

  useEffect(() => {
    // Transcript as it stood when the run started (hydrated history plus the
    // user's new message) — the baseline to restore from after the run's
    // final snapshot replaces the on-screen list with the compacted engine list.
    let baseline: readonly TranscriptMessage[] = [];
    const { unsubscribe } = agent.subscribe({
      onRunInitialized: ({ messages }) => {
        baseline = [...messages];
      },
      onRunFinalized: ({ messages }) => {
        const merged = mergeTranscript(baseline, messages);
        if (!merged) return;
        return {
          messages: merged as Parameters<typeof agent.setMessages>[0],
        };
      },
    });
    return () => unsubscribe();
  }, [agent]);

  return null;
};
