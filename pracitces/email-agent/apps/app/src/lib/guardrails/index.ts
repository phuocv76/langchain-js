/** Guardrail replies mirrored from the agent package for UI detection. */
export const GUARDRAIL_REPLIES = {
  NEWS: "Out of scope. I only answer questions about AI, LLMs, and related news.",
  EMAIL:
    "Out of scope. I only help with email support, Gmail, billing, and related issues.",
  WARRANTY:
    "Out of scope. I only handle warranty and return questions about products.",
} as const;

/** Returns true when assistant text is a scope guardrail reply. */
export const isGuardrailReply = (content: string | undefined): boolean => {
  if (!content?.trim()) {
    return false;
  }

  const normalized = content.trim();
  return (
    Object.values(GUARDRAIL_REPLIES).some(
      (reply) => normalized === reply || normalized.startsWith(reply),
    ) ||
    normalized.startsWith("This assistant only covers AI news") ||
    normalized.startsWith("This message is outside my scope")
  );
};
