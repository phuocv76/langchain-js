# @repo/bff

Hono BFF that composes the CopilotKit runtime endpoint over in-process
LangGraph agents from `@repo/agent`. The chat frontend calls this service
directly with a Firebase bearer token. All durable state (transcript ledger
and engine checkpoints) lives in D1 behind `apps/memory-worker`.

## Endpoints

| Method | Path          | Auth            | Description                                     |
| ------ | ------------- | --------------- | ----------------------------------------------- |
| POST   | `/copilotkit` | Firebase bearer | CopilotKit v2 runtime (in-process agents).      |
| GET    | `/memory/*`   | Firebase bearer | Transcript history for the chat sidebar.        |
| GET    | `/health`     | none            | Liveness probe.                                 |

Authenticated endpoints require `Authorization: Bearer <Firebase ID token>`.
When `ALLOWED_EMAIL_DOMAINS` is configured, only verified emails on those
domains are accepted.

## Processes

`pnpm dev` runs the Hono server on `AGENT_PORT` (default `4000`). `pnpm build`
bundles it to `dist/server.js`; `pnpm start` runs that artifact with plain
Node.

Agents execute through `@repo/agent`'s AG-UI bridge with `D1CheckpointSaver`
for short-term memory — there is no separate LangGraph deployment.

## Environment

Reads from `apps/bff/.env` (see `.env.example` in this directory):
`OPENAI_*`, `AGENT_PORT`, `CORS_ORIGINS`, `ALLOWED_EMAIL_DOMAINS`,
`FIREBASE_*` (required in production), `API_BASE_URL` + `API_SERVICE_TOKEN`
(+ optional `API_TIMEOUT_MS`), and `MEMORY_WORKER_URL` +
`CF_ACCESS_CLIENT_ID` + `CF_ACCESS_CLIENT_SECRET` for durable memory and
checkpoints.
