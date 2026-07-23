# @repo/bff

Hono BFF that mounts the CopilotKit runtime (`createCopilotHonoHandler`) and
the embedded LangGraph platform app (`/langgraph`, D1 checkpoints + thread
metadata when `MEMORY_WORKER_URL` is set). The runtime's `LangGraphAgent`
adapters call `/langgraph` over loopback with the caller's Firebase token.

## Endpoints

| Method | Path          | Auth                         | Description                                      |
| ------ | ------------- | ---------------------------- | ------------------------------------------------ |
| *      | `/copilotkit` | Firebase ID token (Bearer)   | CopilotKit v2 runtime (LangGraphAgent adapters). |
| *      | `/langgraph/*`| Firebase ID token (Bearer)   | Embedded LangGraph platform API (threads/runs).  |
| GET    | `/memory/*`   | Firebase ID token (Bearer)   | Transcript history for the chat sidebar.         |
| GET    | `/health`     | none                         | Liveness probe.                                  |

Set `FIREBASE_PROJECT_ID` to the same project as `VITE_FIREBASE_PROJECT_ID`
in the web app. The BFF verifies ID tokens with Google JWKS (no Admin key).

## Processes

Chat needs the BFF (and optionally the memory worker for D1):

1. This BFF: `pnpm --filter @repo/bff dev` (port `AGENT_PORT`, default `4000`)
2. Memory worker (recommended): `pnpm --filter @repo/memory-worker dev`

`pnpm dev` at the repo root starts the BFF, web app, and workers via Turborepo.
LangGraph Studio is optional: `pnpm --filter @repo/agent studio`.

## Environment

Reads from `apps/bff/.env` (see `.env.example`):
`FIREBASE_PROJECT_ID`, `OPENAI_*`, `AGENT_PORT`, `CORS_ORIGINS`,
`API_BASE_URL`, and optional `MEMORY_WORKER_URL` / realtime vars.
