// Libs for third party
import { copilotkitMiddleware } from '@copilotkit/sdk-js/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { createAgent } from 'langchain';

// Internal
import { getChatModel } from '@agent/models/index.js';
import { DEFAULT_AGENT_SYSTEM_PROMPT } from '@agent/prompts/default-agent.prompt.js';
import { tools } from '@agent/tools/index.js';

/** Builds a ReAct-style conversational agent with CopilotKit streaming support. */
const buildDefaultAgent = () =>
  createAgent({
    model: getChatModel(),
    tools,
    systemPrompt: DEFAULT_AGENT_SYSTEM_PROMPT,
    // `copilotkitMiddleware` bridges the graph to the CopilotKit runtime so the
    // frontend receives streamed tokens and tool-call events.
    middleware: [copilotkitMiddleware],
  });

const defaultAgent = buildDefaultAgent();

/**
 * Compiled graph consumed by the LangGraph dev server.
 * The server provides its own checkpointer/persistence.
 */
export const graph = defaultAgent.graph;

/**
 * Compiles the same agent with in-memory checkpointing.
 * Used by the standalone `POST /chat` REST endpoint (in-process, no dev server).
 */
export const compileWithMemory = (): typeof graph => {
  const agent = buildDefaultAgent();
  agent.checkpointer = new MemorySaver();
  return agent.graph;
};
