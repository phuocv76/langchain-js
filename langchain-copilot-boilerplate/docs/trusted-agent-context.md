# Trusted Agent Context and Durable Memory

The browser never calls the agent runtime directly. The Next.js CopilotKit
proxy validates the Firebase session and forwards its httpOnly cookie only as
`x-agent-user-token` to the trusted agent service over TLS. The agent verifies
the cookie again with revocation checking, then removes that header before the
CopilotKit runtime can forward requests to LangGraph.

Only these non-secret headers reach LangGraph: `x-agent-request-id`,
`x-agent-user-id`, `x-agent-tenant-id`, and `x-agent-roles`. The LangGraph
adapter places them in `configurable.copilotkit_forwarded_headers`; durable
memory middleware converts them to graph state for the active run. Do not add
credentials, raw cookies, or session tokens to graph state, prompts, tool
arguments, logs, or responses.

## Execution flow

1. Next.js removes browser-provided identity headers, verifies the Firebase
   session, and forwards the session cookie plus the runtime secret.
2. Agent middleware verifies the cookie, requires `tenant_id` and `roles`
   Firebase custom claims, and emits sanitized identity headers.
3. The graph loads same-tenant, same-user durable context from the Agent
   Worker's private memory routes, then persists the incoming user message to D1 before it runs the
   model/tool ReAct loop.
4. On completion, the assistant turn is persisted to D1. A failed run therefore
   retains its starting user message while avoiding storage of a partial
   assistant reply. LangChain
   summarization still bounds the live message history.

Invalid or revoked cookies return 401; absent required claims return 403;
missing Firebase configuration returns 503; memory Worker errors surface as a
controlled graph error and do not expose credentials.

## Cloudflare Worker deployment

Deploy `apps/agent` as the single Worker. Create the D1 database, replace the
placeholder D1 database ID in `apps/agent/wrangler.jsonc`,
then apply `apps/agent/migrations/0001_memory.sql`. Configure the remote graph
with the Agent Worker's URL as `MEMORY_SERVICE_URL` and set the same
`MEMORY_INTERNAL_SECRET` in both places. The private `/internal/memory/*`
routes accept only that secret and are never exposed to the browser.

D1 stores full transcripts without automatic expiry. The Worker exposes scoped
append, retrieval, list, thread-delete, and user-delete endpoints. Retrieval
uses the latest turns from the current thread; deletion removes matching D1 rows.
