// Libs for third party
import type { RunnableConfig } from '@langchain/core/runnables';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import { copilotkitEmitMessage } from '@copilotkit/sdk-js/langgraph';
import { createMiddleware } from 'langchain';
import type { Runtime } from 'langchain';

export interface ScopeGuardrailOptions {
  readonly name: string;
  readonly keywords: RegExp;
  readonly outOfScopeMessage: string;
  readonly mode?: 'allowlist' | 'blocklist';
}

const SHORT_GREETING =
  /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no)[!.?\s]*$/i;

/** Returns true when text lacks domain keywords (short greetings are allowed). */
export const isMessageOutOfScope = (
  text: string | undefined,
  keywords: RegExp,
): boolean => {
  if (!text?.trim()) {
    return false;
  }

  const trimmed = text.trim();
  if (SHORT_GREETING.test(trimmed)) {
    return false;
  }

  return !keywords.test(trimmed);
};

/** Extracts plain text from the latest human turn. */
export const latestHumanText = (
  messages: BaseMessage[],
): string | undefined => {
  const lastHuman = [...messages]
    .reverse()
    .find((message) => HumanMessage.isInstance(message));

  if (!lastHuman) {
    return undefined;
  }

  return typeof lastHuman.content === 'string'
    ? lastHuman.content
    : JSON.stringify(lastHuman.content ?? '');
};

/** Returns true when text matches clearly off-topic patterns (greetings allowed). */
export const isMessageOutOfScopeBlocklist = (
  text: string | undefined,
  blocklist: RegExp,
): boolean => {
  if (!text?.trim()) {
    return false;
  }

  const trimmed = text.trim();
  if (SHORT_GREETING.test(trimmed)) {
    return false;
  }

  return blocklist.test(trimmed);
};

/** Emits a guardrail reply to CopilotKit when LangGraph config is available. */
const emitGuardrailReply = async (
  runtime: Runtime,
  message: string,
): Promise<void> => {
  if (!runtime.configurable) {
    return;
  }

  const config = {
    configurable: runtime.configurable,
  } satisfies RunnableConfig;

  try {
    await copilotkitEmitMessage(config, message);
  } catch {
    // CLI and direct graph invokes do not have a CopilotKit runtime attached.
  }
};

/**
 * Builds middleware that replies in-chat and ends the run for off-topic input.
 *
 * @param options - Guardrail name, keyword pattern, and user-facing message.
 */
export const createScopeGuardrailMiddleware = (
  options: ScopeGuardrailOptions,
) =>
  createMiddleware({
    name: options.name,
    beforeModel: {
      canJumpTo: ['end'],
      hook: async (state, runtime) => {
        const text = latestHumanText(state.messages ?? []);

        const outOfScope =
          options.mode === 'blocklist'
            ? isMessageOutOfScopeBlocklist(text, options.keywords)
            : isMessageOutOfScope(text, options.keywords);

        if (!outOfScope) {
          return;
        }

        await emitGuardrailReply(runtime, options.outOfScopeMessage);

        return {
          jumpTo: 'end',
          messages: [new AIMessage(options.outOfScopeMessage)],
          structuredResponse: undefined,
        };
      },
    },
  });
