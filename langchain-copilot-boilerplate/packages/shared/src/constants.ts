/** Graph/agent id shared by the LangGraph registration, runtime, and frontend. */
export const DEFAULT_AGENT_ID = 'defaultAgent' as const;

/** Human-facing product name used across UI surfaces. */
export const APP_NAME = 'LangChain Copilot' as const;

/** Default local ports for each service. */
export const PORTS = {
  web: 3000,
  agentApi: 4000,
  langgraph: 2024,
} as const;
