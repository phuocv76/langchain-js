const EMAIL_INTENTS = new Set([
  'question',
  'feature',
  'bug',
  'billing',
  'complex',
  'other',
]);

const EMAIL_URGENCIES = new Set(['low', 'medium', 'high', 'critical']);

export interface EmailClassification {
  readonly intent: string;
  readonly urgency: string;
  readonly topic: string;
  readonly summary: string;
}

/** Returns true when value matches the email classification shape. */
const isEmailClassification = (value: unknown): value is EmailClassification => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.intent === 'string' &&
    EMAIL_INTENTS.has(record.intent) &&
    typeof record.urgency === 'string' &&
    EMAIL_URGENCIES.has(record.urgency) &&
    typeof record.topic === 'string' &&
    typeof record.summary === 'string'
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

/**
 * Parses internal email-agent classification JSON from assistant message text.
 *
 * @param content - Raw assistant message text.
 */
export const parseEmailClassification = (
  content: string | undefined,
): EmailClassification | null => {
  if (!content?.trim()) {
    return null;
  }

  const parsed = parseJsonObject(content.trim());
  if (isEmailClassification(parsed)) {
    return parsed;
  }

  return null;
};
