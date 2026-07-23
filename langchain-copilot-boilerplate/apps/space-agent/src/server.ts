// Internal
import { startAgentServer } from '@repo/agent-runtime';
import {
  createWorkspaceCopilotRuntime,
  createWorkspaceEmbedApp,
} from '@agent/graphs/registry.js';

// All routing, CORS, and Firebase identity live in the shared runtime
// composition; this app only supplies its product wiring (registry graphs).
startAgentServer({
  serviceName: '@repo/space-agent',
  embedApp: createWorkspaceEmbedApp(),
  copilotRuntime: createWorkspaceCopilotRuntime(),
});
