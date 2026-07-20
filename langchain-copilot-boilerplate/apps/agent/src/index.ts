/**
 * Public surface for `@repo/agent`.
 *
 * The BFF (`@repo/bff`) hosts the Hono + CopilotKit endpoint; this package
 * owns LangGraph graphs (run in-process via BuiltInAgent), tools, and the
 * CopilotRuntime factory. Checkpoint/resume uses D1 when MEMORY_WORKER_URL
 * is set.
 */
export { corsOrigins, env } from './config/env.js';
export { createCopilotRuntime } from './config/intelligence.js';
export { requireAgentUser } from './middleware/agent-user-auth.js';
export { errorHandler } from './middleware/error.js';
export { healthRoute } from './routes/health.route.js';
export { memoryRoute } from './routes/memory.route.js';
export { logger } from './utils/logger.js';
