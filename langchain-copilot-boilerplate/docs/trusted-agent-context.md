# Trusted Agent Context and Durable Memory

The chat frontend calls the agent runtime directly with the signed-in user's
Firebase ID token (`Authorization: Bearer`). The agent verifies the token with
revocation checking and, when `ALLOWED_EMAIL_DOMAINS` is configured, only
accepts verified emails on those domains. It then removes the credential
before the CopilotKit runtime can forward requests to LangGraph. `roles` come
from an optional custom claim (defaulting to none).

Only these non-secret headers reach LangGraph: `x-agent-request-id`,
`x-agent-user-id`, `x-agent-user-email`, and `x-agent-roles`. The LangGraph
server copies each `x-*` request header into `config.configurable` under its
lowercased name; durable memory middleware converts them to graph state for
the active run. Do not add
credentials, raw ID tokens, or session material to graph state, prompts, tool
arguments, logs, or responses.

## Execution flow

1. The frontend attaches the Firebase ID token to every `/copilotkit`,
   `/chat`, and `/memory` request; CORS restricts browser origins to
   `CORS_ORIGINS`.
2. Agent middleware verifies the token, enforces the allowed email domains
   (verified emails only), deletes the `authorization` header, and emits
   sanitized identity headers.
3. The graph loads same-user durable context from the configured
   memory service (if any), then persists the incoming user message before it
   runs the model/tool ReAct loop.
4. On completion, the assistant turn is persisted. A failed run therefore
   retains its starting user message while avoiding storage of a partial
   assistant reply. LangChain summarization still bounds the live message
   history.

Invalid or revoked tokens return 401; accounts outside the allowed email
domains return 403; missing Firebase configuration returns 503.

## Calling the existing product REST API

Tools never call the product API with user credentials. The api-client
(`apps/agent/src/services/api-client.ts`) authenticates with the
`API_SERVICE_TOKEN` service credential and forwards the acting user as
`X-Acting-User-Id`, `X-Acting-User-Email`, and `X-Request-Id` headers. The
product API must trust this agent service and enforce per-user authorization
from those headers. Identity always comes from the verified trusted context —
tools must ignore identity fields in model-generated arguments.

On the product API (space-api) side, `agentAuthMiddleware` implements the
matching contract: a request carrying `X-Acting-User-Email` must present the
`AGENT_SERVICE_TOKEN` secret as `Authorization: Bearer` (compared in constant
time). The middleware loads the existing user by email — it never creates
accounts — requires an allowed domain and active status, and the API's
regular permission checks then apply to that acting user. Configure the
secret with `wrangler secret put AGENT_SERVICE_TOKEN --env dev` and set the
same value as `API_SERVICE_TOKEN` in `apps/agent/.env`.

## Durable memory service (optional)

Durable transcript memory is served by `apps/memory-worker` (Cloudflare
Worker: D1 turn store + best-effort Vectorize/Workers AI semantic recall).
Set `MEMORY_WORKER_URL` to enable it; when unset, memory retrieval and
persistence no-op and chat works statelessly across restarts. Memory
failures never fail a chat turn — the middleware degrades to no memory.

- Local: `pnpm --filter @repo/memory-worker dev:offline` runs entirely on
  this machine (D1 is a local SQLite file; semantic recall is disabled, so
  retrieval returns recent turns only). Point the agent at
  `MEMORY_WORKER_URL=http://localhost:8788`. No Cloudflare account needed.
  After `wrangler login`, `pnpm dev` adds real embeddings.
- Deployed: the worker sits behind Cloudflare Access, so also set the
  service-token pair `CF_ACCESS_CLIENT_ID` + `CF_ACCESS_CLIENT_SECRET`
  (both together). Identity scoping is by `userId` from the trusted agent
  context; the worker rejects payloads without it.

## Deployment boundary

The LangGraph server (`:2024` in dev) trusts the sanitized identity headers.
It must only be reachable from the agent runtime — bind it to localhost or a
private network. Anyone who can reach it directly can impersonate any user.
