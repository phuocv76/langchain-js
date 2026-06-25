import { useCallback, useState } from "react";

// Internal
import type { AgentId } from "@/lib/agents";

export interface AgentSelection {
  readonly activeAgentId: AgentId;
  readonly agentSessionKey: number;
  readonly isAgentsPanelOpen: boolean;
  readonly selectAgent: (agentId: AgentId) => void;
  readonly toggleAgentsPanel: () => void;
}

/** Tracks the active practice agent and layout panel state for the shell. */
export const useAgentSelection = (
  initialAgentId: AgentId = "newsAgent",
): AgentSelection => {
  const [activeAgentId, setActiveAgentId] =
    useState<AgentId>(initialAgentId);
  const [agentSessionKey, setAgentSessionKey] = useState(0);
  const [isAgentsPanelOpen, setIsAgentsPanelOpen] = useState(true);

  const selectAgent = useCallback(
    (agentId: AgentId): void => {
      if (agentId === activeAgentId) {
        return;
      }

      setActiveAgentId(agentId);
      setAgentSessionKey((key) => key + 1);
    },
    [activeAgentId],
  );

  const toggleAgentsPanel = useCallback((): void => {
    setIsAgentsPanelOpen((open) => !open);
  }, []);

  return {
    activeAgentId,
    agentSessionKey,
    isAgentsPanelOpen,
    selectAgent,
    toggleAgentsPanel,
  };
};
