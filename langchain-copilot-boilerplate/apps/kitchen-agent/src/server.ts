// Internal
import { startAgentServer } from '@repo/agent-runtime';
import {
  createKitchenCopilotRuntime,
  createKitchenEmbedApp,
} from '@agent/graphs/registry.js';

// All routing, CORS, and Firebase identity live in the shared runtime
// composition; this app only supplies its product wiring (registry graphs).
startAgentServer({
  serviceName: '@repo/kitchen-agent',
  embedApp: createKitchenEmbedApp(),
  copilotRuntime: createKitchenCopilotRuntime(),
});
