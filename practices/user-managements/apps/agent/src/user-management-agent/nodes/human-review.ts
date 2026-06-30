// Libs for third party
import { interrupt } from '@langchain/langgraph';
import type { LangGraphRunnableConfig } from '@langchain/langgraph';

// Types
import type { MutationReviewDecision } from '../schemas/mutation-review.js';

/** Parses CopilotKit resume payloads (string or object). */
const parseReviewDecision = (value: unknown): MutationReviewDecision => {
  if (typeof value === 'string') {
    try {
      return parseReviewDecision(JSON.parse(value));
    } catch {
      return { action: 'approve' };
    }
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.action === 'string') {
      return {
        action: record.action as MutationReviewDecision['action'],
        feedback:
          typeof record.feedback === 'string' ? record.feedback : undefined,
      };
    }
  }

  return { action: 'approve' };
};

/** Payload shown in the UI when a mutation needs human approval. */
export interface MutationInterruptPayload {
  readonly action: string;
  readonly preview: unknown;
  readonly message?: string;
}

/**
 * Pauses tool execution until the user approves or rejects a directory mutation.
 *
 * @param payload - Preview data for the interrupt UI.
 * @param config - Runnable config with optional autoApprove flag.
 * @returns Whether the mutation should proceed.
 */
export const confirmMutation = (
  payload: MutationInterruptPayload,
  config?: LangGraphRunnableConfig,
): boolean => {
  const autoApprove = Boolean(config?.configurable?.autoApprove);

  if (autoApprove) {
    return true;
  }

  const rawDecision = interrupt({
    ...payload,
    hint: 'Approve to apply this change, or reject to cancel.',
  });

  const decision = parseReviewDecision(rawDecision);
  return decision.action === 'approve';
};
