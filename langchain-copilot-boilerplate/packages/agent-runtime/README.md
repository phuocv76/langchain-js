# @repo/agent-runtime

Product-agnostic agent runtime shared by every product server under `apps/`.
This package never imports product code — products inject their graphs.

## What it owns

- **Identity**: `requireAgentUser` verifies Firebase ID tokens (Google JWKS)
  and replaces them with sanitized `x-agent-*` claim headers;
  `identityFromRequest` reads them back.
- **Embedded LangGraph platform app**: `createLangGraphEmbedApp({graphs,
  checkpointer, threads})` — threads/runs routes plus the assistants shim,
  with verified claims rewritten into every run body.
- **CopilotKit runtime**: `createCopilotRuntime(registry)` builds
  LangGraphAgent adapters that call the embed app over loopback.
- **D1 persistence** (via `workers/memory-worker`): `D1CheckpointSaver`,
  `D1ThreadSaver`, transcript memory client, all tenant-scoped by the
  verified user.
- **Durable-memory middleware**: retrieval before the model call, transcript
  writes after, `manage_memory` tool, realtime event publishing.
- **Server composition**: `startAgentServer({serviceName, embedApp,
  copilotRuntime})` — CORS, logging, auth, routes, boot.
- **Infra env schema** (`env`): ports, CORS, OpenAI, Firebase, worker URLs.
  Products layer their own fragment on top (see
  `apps/space-agent/src/config/env.ts`).

## How a product consumes it

```ts
// apps/<product>-agent/src/server.ts
import { startAgentServer } from '@repo/agent-runtime';
import { createMyEmbedApp, createMyCopilotRuntime } from '@agent/graphs/registry.js';

startAgentServer({
  serviceName: '@repo/my-agent',
  embedApp: createMyEmbedApp(),
  copilotRuntime: createMyCopilotRuntime(),
});
```

The single wiring point per product is its `src/graphs/registry.ts`. See
`apps/kitchen-agent` for the minimal skeleton.

## Upgrade caution

`@langchain/langgraph-api`, `@copilotkit/runtime`, and `@ag-ui/langgraph`
are pinned exactly (see the `catalog:` in `pnpm-workspace.yaml`): the embed
app and assistants shim couple to their internals. After bumping, run the
regression suite: `pnpm --filter @repo/space-agent regression:*`.
