// Libs for third party
import { DEFAULT_AGENT_ID } from '@repo/shared';

/** Describes one agent exposed through the CopilotKit runtime. */
export interface AgentDefinition {
  /** Public id used by the frontend `agent` prop and runtime routing. */
  readonly id: string;
  /** Graph id registered in `langgraph.json` (usually equal to `id`). */
  readonly graphId: string;
  /** Short human description. */
  readonly description: string;
}

/**
 * Registry of agents served by this backend.
 *
 * To add an agent:
 *   1. Create `src/agents/<name>/graph.ts` exporting `graph`.
 *   2. Register it in `langgraph.json` under `graphs`.
 *   3. Add an entry here — the CopilotKit runtime picks it up automatically.
 */
export const AGENT_REGISTRY: readonly AgentDefinition[] = [
  {
    id: DEFAULT_AGENT_ID,
    graphId: DEFAULT_AGENT_ID,
    description: 'Default conversational agent with a greeting tool.',
  },
];
