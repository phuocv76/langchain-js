# @repo/bff

Hono BFF that mounts the CopilotKit runtime (`createCopilotHonoHandler`) and
runs LangGraph agents **in-process** (BuiltInAgent + D1 checkpoints when
`MEMORY_WORKER_URL` is set).

## Endpoints

| Method | Path          | Auth                         | Description                                      |
| ------ | ------------- | ---------------------------- | ------------------------------------------------ |
| *      | `/copilotkit` | Firebase ID token (Bearer)   | CopilotKit v2 runtime (in-process graph).        |
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
