const PLACEHOLDER_THREAD_NAMES = new Set(["Untitled", "New conversation"]);

export const MAX_THREAD_TITLE_LENGTH = 80;

/** Returns true when the thread has no meaningful title yet. */
export const isPlaceholderThreadName = (
  name: string | null | undefined,
): boolean => {
  if (!name?.trim()) {
    return true;
  }

  return PLACEHOLDER_THREAD_NAMES.has(name.trim());
};

/** Extracts plain text from a CopilotKit / AG-UI message content value. */
export const stringifyMessageContent = (content: unknown): string => {
  if (typeof content === "string") {
    return content.trim();
  }

  if (content == null) {
    return "";
  }

  try {
    return JSON.stringify(content).trim();
  } catch {
    return "";
  }
};

/**
 * Builds a sidebar title from the first user message (ChatGPT-style).
 *
 * @param content - Raw message content from the agent transcript.
 * @returns A single-line title, or null when content is empty.
 */
export const formatThreadTitleFromMessage = (
  content: unknown,
): string | null => {
  const singleLine = stringifyMessageContent(content)
    .replace(/\s+/g, " ")
    .trim();

  if (!singleLine) {
    return null;
  }

  if (singleLine.length <= MAX_THREAD_TITLE_LENGTH) {
    return singleLine;
  }

  return `${singleLine.slice(0, MAX_THREAD_TITLE_LENGTH - 1).trim()}…`;
};

/**
 * Resolves the label shown in the sidebar for a thread.
 *
 * @param name - Thread name from CopilotKit Intelligence.
 * @returns A user-facing sidebar label.
 */
export const formatThreadDisplayName = (
  name: string | null | undefined,
): string => {
  if (isPlaceholderThreadName(name)) {
    return "New conversation";
  }

  return name!.trim();
};
