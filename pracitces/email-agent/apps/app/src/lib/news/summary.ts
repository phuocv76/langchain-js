// Internal
import { isGuardrailReply } from '../guardrails';

export interface NewsSummary {
  readonly title: string;
  readonly summary: string;
  readonly impact: string;
}

/** Returns true when value matches the news summary shape. */
const isNewsSummary = (value: unknown): value is NewsSummary => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.title === 'string' &&
    typeof record.summary === 'string' &&
    typeof record.impact === 'string'
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
 * Extracts a structured news summary from assistant message content.
 *
 * State snapshots are ignored when the message already has plain text so a
 * prior turn's structuredResponse cannot replace a guardrail reply.
 *
 * @param content - Raw assistant message text.
 * @param stateSnapshot - Optional agent state for the current run.
 */
export const parseNewsSummary = (
  content: string | undefined,
  stateSnapshot?: unknown,
): NewsSummary | null => {
  if (isGuardrailReply(content)) {
    return null;
  }

  const fromContent = parseNewsSummaryFromContent(content);
  if (fromContent) {
    return fromContent;
  }

  if (content?.trim()) {
    return null;
  }

  const fromState = (
    stateSnapshot as { structuredResponse?: unknown } | undefined
  )?.structuredResponse;

  if (isNewsSummary(fromState)) {
    return fromState;
  }

  return null;
};
