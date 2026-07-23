// Libs for third party
import { StateSchema } from '@langchain/langgraph';
import type { UntrackedValue } from '@langchain/langgraph';
import { z } from 'zod';

export interface TrustedAgentStateContext {
  readonly requestId: string;
  readonly userId: string;
  /** Verified email — the acting-user key for product API calls. */
  readonly email: string;
  readonly roles: string[];
  readonly threadId: string;
}

/**
 * Graph-state fields owned by the durable-memory middleware. Agents that use
 * `durableMemoryMiddleware` pass this schema to `createAgent` so the fields
 * exist on their state; the `copilotkit`/`messages` channels come from the
 * CopilotKit middleware and must not be re-declared here.
 *
 * Runtime and type shapes intentionally differ to work around an upstream
 * incompatibility (see langchain-ai/deepagentsjs#75):
 * - Runtime: plain zod fields, which LangGraph turns into LastValue channels.
 *   `createAgent` registers middleware schemas more than once, and duplicated
 *   non-LastValue channels (e.g. UntrackedValue) throw
 *   "Channel already exists with a different type" at graph construction.
 * - Types: UntrackedValue fields, because this zod release does not satisfy
 *   this LangGraph release's `StateSchemaField` type, which otherwise
 *   collapses middleware state inference.
 * Graph construction is exercised by the runtime; revisit once the LangChain
 * stack is upgraded past the duplicate-channel bug.
 */
const durableMemoryFields = {
  agentContext: z.custom<TrustedAgentStateContext>().optional(),
  retrievedMemory: z.array(z.string()).optional(),
  memoryWriteIds: z.array(z.string()).optional(),
};

type DurableMemoryFieldTypes = {
  /** Verified identity metadata only; raw Firebase credentials are never state. */
  agentContext: UntrackedValue<TrustedAgentStateContext>;
  /** Bounded, sanitized transcript excerpts retrieved before the model call. */
  retrievedMemory: UntrackedValue<string[]>;
  /** Durable-memory write ids emitted after the agent completes. */
  memoryWriteIds: UntrackedValue<string[]>;
};

export const DurableMemoryStateSchema = new StateSchema(
  durableMemoryFields as unknown as DurableMemoryFieldTypes,
);
