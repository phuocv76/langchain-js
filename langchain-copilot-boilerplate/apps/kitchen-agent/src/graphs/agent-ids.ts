/**
 * Agent id shared with the kitchen frontend (`agentId` prop / vendored
 * contracts). Keep both sides in sync when it changes.
 *
 * Dependency-free on purpose: pure clients import the id from here without
 * pulling the graph (whose construction needs a configured model provider).
 */
export const KITCHEN_AGENT_ID = 'kitchenAgent';
