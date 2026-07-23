/**
 * Public surface for `@repo/agent-runtime` — the product-agnostic half of
 * the agent backend. Consumers (the product servers under `apps/`) wire
 * their own graphs into `createLangGraphEmbedApp` and
 * `createCopilotRuntime`; this package never imports product code.
 */

// Environment (infrastructure fragment) and derived values.
export {
  allowedEmailDomains,
  corsOrigins,
  env,
  envSchema,
  type Env,
} from './config/env.js';

// CopilotKit runtime factory over an injected agent registry.
export {
  LANGGRAPH_BASE_PATH,
  createCopilotRuntime,
  type AgentDefinition,
} from './config/copilot-runtime.js';
export type { CopilotRuntime } from '@copilotkit/runtime/v2';

// Embedded LangGraph platform app over injected graphs and persistence.
export {
  createLangGraphEmbedApp,
  type EmbedAppOptions,
  type EmbedGraphs,
} from './services/langgraph-embed-app.js';

// Verified identity: Firebase Bearer -> sanitized x-agent-* claims.
export {
  identityFromRequest,
  isAllowedEmail,
  readBearerToken,
  requireAgentUser,
} from './middleware/agent-user-auth.js';
export {
  FirebaseAuthError,
  verifyFirebaseIdToken,
  type VerifiedFirebaseUser,
} from './services/firebase-auth.js';

// Tenant scoping for persistence outside LangGraph configurable.
export {
  CHECKPOINT_USER_ID_KEY,
  getCheckpointUserId,
  runWithCheckpointUser,
} from './services/checkpoint-user-context.js';

// D1 persistence through the memory worker.
export { D1CheckpointSaver } from './services/d1-checkpoint-saver.js';
export {
  D1ThreadSaver,
  createInMemoryThreadSaver,
  type StoredThread,
} from './services/d1-thread-saver.js';
export {
  MemoryWorkerError,
  accessHeaders,
  requestMemoryWorker,
} from './services/memory-worker-client.js';
export {
  appendMemoryTurn,
  deleteMemoryThread,
  deleteMemoryUser,
  listMemoryThread,
  listMemoryThreads,
  renameMemoryThread,
  retrieveMemory,
  type MemoryTurnRecord,
} from './services/memory-client.js';

// Durable-memory graph middleware and its state schema.
export {
  durableMemoryMiddleware,
  resolveTrustedContext,
} from './middleware/durable-memory.js';
export {
  DurableMemoryStateSchema,
  type TrustedAgentStateContext,
} from './middleware/durable-memory-state.js';

// Cross-session realtime fan-out (no-op when unconfigured).
export { nowIso, publishRealtimeEvent } from './services/realtime/index.js';

// HTTP surface shared by every deployment of the runtime.
export { errorHandler } from './middleware/error.js';
export { createHealthRoute } from './routes/health.route.js';
export { memoryRoute } from './routes/memory.route.js';
export { logger } from './utils/logger.js';

// Model provider (OPENAI_* env owned by this package).
export { getChatModel } from './models/chat-model.js';

// Standard product-server composition; products supply registry wiring only.
export {
  createAgentServerApp,
  createCopilotKitRequestHandler,
  startAgentServer,
  type AgentServerOptions,
} from './server/agent-server.js';
