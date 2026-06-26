// Internal
import { parseEmailClassification } from './classification';

/** Returns true when assistant text is internal pipeline output only. */
export const isInternalEmailAssistantContent = (
  content: string,
): boolean => parseEmailClassification(content) !== null;
