// Internal
import { isGuardrailReply } from "../guardrails";

export interface NewsSummary {
  readonly title: string;
  readonly summary: string;
  readonly impact: string;
}

/** Returns true when value matches the news summary shape. */
const isNewsSummary = (value: unknown): value is NewsSummary => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.title === "string" &&
    typeof record.summary === "string" &&
    typeof record.impact === "string"
  );
};

/** Attempts to parse a JSON object from arbitrary assistant text. */
const parseJsonObject = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/** Parses a news summary from assistant message text only. */
const parseNewsSummaryFromContent = (
  content: string | undefined,
): NewsSummary | null => {
  if (!content?.trim()) {
    return null;
  }

  const trimmed = content.trim();
  const direct = parseJsonObject(trimmed);
  if (isNewsSummary(direct)) {
    return direct;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    const parsed = parseJsonObject(fenced[1].trim());
    if (isNewsSummary(parsed)) {
      return parsed;
    }
  }

  const embedded = trimmed.match(/\{[\s\S]*\}/);
  if (embedded?.[0]) {
    const parsed = parseJsonObject(embedded[0]);
    if (isNewsSummary(parsed)) {
      return parsed;
    }
  }

  return null;
};

/**
 * Extracts a structured news summary from this assistant message's content only.
 *
 * Run state is intentionally not consulted — backfilling from state duplicates
 * the final summary on earlier tool-call turns in the same run.
 *
 * @param content - Raw assistant message text for the current turn.
 */
export const parseNewsSummary = (
  content: string | undefined,
): NewsSummary | null => {
  if (isGuardrailReply(content)) {
    return null;
  }

  return parseNewsSummaryFromContent(content);
};
