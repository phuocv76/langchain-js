export const MAX_THREAD_TITLE_LENGTH = 80;

const PLACEHOLDER_NAMES = new Set(['Untitled', 'New conversation']);

/** Extracts plain text from CopilotKit message content. */
export const stringifyMessageContent = (content: unknown): string => {
  if (typeof content === 'string') return content.trim();
  if (content == null) return '';
  try {
    return JSON.stringify(content).trim();
  } catch {
    return '';
  }
};

/** Formats a thread name for the sidebar. */
export const formatThreadDisplayName = (
  name: string | null | undefined,
): string => {
  if (!name?.trim() || PLACEHOLDER_NAMES.has(name.trim())) {
    return 'New conversation';
  }
  return name.trim();
};

/** Builds a title from the first user message. */
export const formatThreadTitleFromMessage = (
  content: unknown,
): string | null => {
  const line = stringifyMessageContent(content).replace(/\s+/g, ' ').trim();
  if (!line) return null;
  if (line.length <= MAX_THREAD_TITLE_LENGTH) return line;
  return `${line.slice(0, MAX_THREAD_TITLE_LENGTH - 1).trim()}…`;
};
