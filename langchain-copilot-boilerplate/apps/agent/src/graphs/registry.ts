// Libs for third party
import { DEFAULT_AGENT_ID } from '@repo/shared';

/** Describes one agent exposed through the CopilotKit runtime. */
export interface AgentDefinition {
  /** Public id used by the frontend `agent` prop and runtime routing. */
  readonly id: string;
  /** Short human description. */
  readonly description: string;
}

/**
 * Registry of agents served by this backend.
 *
 * To add an agent:
 *   1. Create `src/agents/<name>/graph.ts` exporting the compiled graph and
 *      an AG-UI bridge (see `workspace-agent/agui-bridge.ts`).
 *   2. Add an entry here and map it in `config/intelligence.ts`.
 */
export const AGENT_REGISTRY: readonly AgentDefinition[] = [
  {
    id: DEFAULT_AGENT_ID,
    description:
      'Workspace assistant: employee/project/time-off lookups over the product API, with bounded conversation memory.',
  },
];
