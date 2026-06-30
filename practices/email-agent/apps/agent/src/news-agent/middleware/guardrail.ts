// Libs for third party
import { createMiddleware } from "langchain";

// Internal
import { GUARDRAIL_KEYWORDS, GUARDRAILS } from "../../constants/messages";
import { createScopeGuardrailMiddleware } from "../../lib/scope-guardrail";

/** Rejects off-topic questions in-chat for the news agent. */
export const newsScopeGuardrailMiddleware = createScopeGuardrailMiddleware({
  name: "NewsScopeGuardrail",
  keywords: GUARDRAIL_KEYWORDS.NEWS,
  outOfScopeMessage: GUARDRAILS.NEWS,
});

/** Adds English-only and article-count constraints before each model call. */
export const newsPromptGuardrailMiddleware = createMiddleware({
  name: "NewsPromptGuardrail",
  wrapModelCall: async (request, handler) => {
    const augmented = {
      ...request,
      systemMessage: request.systemMessage.concat(
        "\n\nRespond in English. Summarize at most five distinct articles.",
      ),
    };
    return handler(augmented);
  },
});

/** Scope guardrail plus prompt constraints for the news agent. */
export const guardrailMiddleware = [
  newsScopeGuardrailMiddleware,
  newsPromptGuardrailMiddleware,
];
