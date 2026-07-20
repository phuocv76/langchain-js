# Trusted Agent Context and Durable Memory

The chat frontend calls the agent runtime directly with the signed-in user's
Firebase ID token (`Authorization: Bearer`). The agent verifies the token with
Google JWKS and, when `ALLOWED_EMAIL_DOMAINS` is configured, only accepts
verified emails on those domains. It then replaces the inbound credential with
sanitized identity headers. `roles` come from an optional custom claim
(defaulting to none).

Non-secret claims travel further as `x-agent-request-id`, `x-agent-user-id`,
`x-agent-user-email`, and `x-agent-roles`. The verified ID token is also
forwarded as `x-agent-access-token` so product-API tools can authenticate as
the signed-in user — it must never enter graph state, prompts, tool results,
durable memory, or logs. The durable memory middleware converts the non-secret
claims to graph state for the active run.

## Execution flow

1. The frontend attaches the Firebase ID token to every `/copilotkit` and
   `/memory` request; CORS restricts browser origins to
   `CORS_ORIGINS`.
2. Agent middleware verifies the token, enforces the allowed email domains
   (verified emails only), emits sanitized identity headers, and forwards the
   verified ID token as `x-agent-access-token` for product-API Bearer auth.
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

Tools call the product API with the signed-in user's Firebase ID token as
`Authorization: Bearer` — the same credential the web app uses. The BFF
verifies the token, then forwards it to the LangGraph run as
`x-agent-access-token` (via CopilotKit `forwardHeaders`). The api-client
(`apps/agent/src/services/api-client.ts`) presents that token to the API and
adds `X-Request-Id`. Identity for path defaults (e.g. "my profile") still
comes from the verified trusted context (`x-agent-user-email`) — tools must
ignore identity fields in model-generated arguments.

Do not put the access token into graph state, prompts, tool results, durable
memory, or logs. It lives only in run configurable for the duration of the
request.

Set `API_BASE_URL` in `apps/bff/.env` (and `apps/agent/.env`) to the product
API origin (e.g. `http://localhost:8787/`).

## Durable memory service

All durable state is served by `apps/memory-worker` (Cloudflare Worker over
D1): the transcript turn store with best-effort Vectorize/Workers AI semantic
recall, and the engine's LangGraph checkpoints (short-term memory). Set
`MEMORY_WORKER_URL` to enable it; when unset, transcript memory no-ops and
checkpoints fall back to process memory (threads reset on restart).

The two stores fail differently by design: transcript memory is an
enhancement layer, so its failures never fail a chat turn; checkpoints are
correctness-critical, so checkpoint errors fail the run instead of silently
forking conversation state. Checkpoint rows are scoped by the verified
`userId` — a guessed thread UUID can never load another user's state.

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

The graph runs inside the agent process, so there is no separate agent
server to protect. The remaining boundary is the memory worker: deployed
instances sit behind Cloudflare Access and must only accept the agent's
service-token pair — anyone who can call the worker directly can read or
write stored conversation state for arbitrary users.
