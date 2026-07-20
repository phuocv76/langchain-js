/**
 * Public surface for `@repo/agent`.
 *
 * The BFF (`@repo/bff`) hosts the Hono server and CopilotKit endpoint; this
 * package owns the in-process LangGraph agents, tools, and D1 checkpoint
 * persistence that the runtime composes.
 */
export {
  assertUserVerificationConfigured,
  corsOrigins,
  env,
} from './config/env.js';
export { createCopilotRuntime } from './config/intelligence.js';
export { requireAgentUser } from './middleware/agent-user-auth.js';
export { errorHandler } from './middleware/error.js';
export { healthRoute } from './routes/health.route.js';
export { memoryRoute } from './routes/memory.route.js';
export { logger } from './utils/logger.js';
