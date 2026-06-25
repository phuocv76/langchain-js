// Libs for third party
import { AIMessage } from "@langchain/core/messages";
import { copilotkitEmitMessage } from "@copilotkit/sdk-js/langgraph";
import { Command, END } from "@langchain/langgraph";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";

// Internal
import {
  GUARDRAIL_KEYWORDS,
  GUARDRAILS,
  STEPS,
} from "../../constants/messages";
import {
  isMessageOutOfScope,
  latestHumanText,
} from "../../lib/scope-guardrail";

// Types
import type { EmailAgentStateType } from "../state";

/**
 * Blocks off-topic chat input with an in-chat assistant message instead of
 * starting the Gmail workflow.
 *
 * @param state - Current graph state.
 */
export const scopeCheck = async (
  state: EmailAgentStateType,
  config: LangGraphRunnableConfig,
): Promise<Command<typeof END | "readEmail">> => {
  const text = latestHumanText(state.messages ?? []);

  if (isMessageOutOfScope(text, GUARDRAIL_KEYWORDS.EMAIL)) {
    try {
      await copilotkitEmitMessage(config, GUARDRAILS.EMAIL);
    } catch {
      // CopilotKit is not attached for CLI runs.
    }

    return new Command({
      update: {
        messages: [new AIMessage(GUARDRAILS.EMAIL)],
        steps: [STEPS.SCOPE_CHECK_REJECTED],
      },
      goto: END,
    });
  }

  return new Command({
    update: {
      steps: [STEPS.SCOPE_CHECK_PASSED],
    },
    goto: "readEmail",
  });
};
