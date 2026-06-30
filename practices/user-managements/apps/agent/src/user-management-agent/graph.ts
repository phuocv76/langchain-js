// Libs for third party
import { MemorySaver } from '@langchain/langgraph';
import { copilotkitMiddleware } from '@copilotkit/sdk-js/langgraph';
import { createAgent } from 'langchain';

// Internal
import { buildAdminSystemPrompt } from '../constants/prompts.js';
import { getChatModel } from '../lib/model.js';
import {
  rolePromptMiddleware,
  userManagementScopeGuardrailMiddleware,
} from './middleware/guardrail.js';
import { adminTools } from './tools/index.js';

/** ReAct agent for user directory operations with mutations and RAG. */
const buildUserManagementAgent = () =>
  createAgent({
    model: getChatModel(),
    tools: adminTools,
    systemPrompt: buildAdminSystemPrompt(),
    middleware: [
      copilotkitMiddleware,
      userManagementScopeGuardrailMiddleware,
      rolePromptMiddleware,
    ],
  });

const userManagementAgent = buildUserManagementAgent();

/** Compiled graph for the LangGraph dev server (checkpointer provided by server). */
export const graph = userManagementAgent.graph;

/** Compiles with in-memory checkpointing for CLI demos. */
export const compileWithMemory = (): typeof graph => {
  const agent = buildUserManagementAgent();
  agent.checkpointer = new MemorySaver();
  return agent.graph;
};
