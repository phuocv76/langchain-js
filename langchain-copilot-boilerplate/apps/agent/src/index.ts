/**
 * Public surface for `@repo/agent`.
 *
 * The BFF (`@repo/bff`) hosts the Hono + CopilotKit endpoint plus the
 * embedded LangGraph platform app; this package owns LangGraph graphs,
 * tools, the CopilotRuntime factory, and the embed app builder. Checkpoints
 * and thread metadata use D1 when MEMORY_WORKER_URL is set.
 */
export { corsOrigins, env } from './config/env.js';
export {
  LANGGRAPH_BASE_PATH,
  createCopilotRuntime,
} from './config/intelligence.js';
export { createLangGraphEmbedApp } from './services/langgraph-embed-app.js';
export { requireAgentUser } from './middleware/agent-user-auth.js';
export { errorHandler } from './middleware/error.js';
export { healthRoute } from './routes/health.route.js';
export { memoryRoute } from './routes/memory.route.js';
export { logger } from './utils/logger.js';
