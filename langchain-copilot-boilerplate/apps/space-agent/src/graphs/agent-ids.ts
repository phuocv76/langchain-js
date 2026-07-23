/**
 * Agent id shared with the space frontend (`agentId` prop / vendored
 * contracts) and the `langgraph.json` graph key. Keep all three in sync
 * when it changes.
 *
 * Dependency-free on purpose: regression checks and other pure clients
 * import the id from here without pulling the graph (whose construction
 * needs a configured model provider).
 */
export const WORKSPACE_AGENT_ID = 'workspaceAgent';

/**
 * Hand-built StateGraph demo (conditional edges over resume data). Shares
 * the same sync contract as WORKSPACE_AGENT_ID: frontend `agentId`,
 * `langgraph.json` graph key.
 */
export const RESUME_AGENT_ID = 'resumeAgent';
