// Internal
import { GUARDRAIL_KEYWORDS, GUARDRAILS } from "../../constants/messages";
import { createScopeGuardrailMiddleware } from "../../lib/scope-guardrail";

/** Rejects off-topic questions in-chat for warranty specialists. */
export const warrantyScopeGuardrailMiddleware = createScopeGuardrailMiddleware({
  name: "WarrantyScopeGuardrail",
  keywords: GUARDRAIL_KEYWORDS.WARRANTY,
  outOfScopeMessage: GUARDRAILS.WARRANTY,
});
