# @repo/memory-worker

Cloudflare Worker owning all durable agent state in D1: transcript turns
(long-term memory + history UI), LangGraph engine checkpoints (short-term
memory), platform thread metadata, and optional semantic recall via
Vectorize + Workers AI.

One codebase, **one deployment per product** (wrangler envs). Every SQL
statement is scoped by `user_id`; the D1 database itself is scoped per
product, so product data never mixes.

| Env | Purpose | D1 database | Vectorize/AI |
|-----|---------|-------------|--------------|
| `space` | deployable | `agent-memory` (kept from before the multi-product layout) | yes |
| `space-offline` | local `dev:space` (:8788) | `agent-memory` (miniflare) | no — recent-turn recall only |
| `kitchen` | deployable | `kitchen-agent-memory` | yes |
| `kitchen-offline` | local `dev:kitchen` (:8790) | `kitchen-agent-memory` (miniflare) | no |

The top-level wrangler config declares NO bindings — always pass
`--env <product>` (a bare `wrangler deploy` would ship a worker without a
database).

## Local development

```bash
pnpm --filter @repo/memory-worker db:apply:local:space
pnpm --filter @repo/memory-worker dev:space      # http://localhost:8788
# kitchen: db:apply:local:kitchen + dev:kitchen  # http://localhost:8790
```

Point the product's agent server at it (`MEMORY_WORKER_URL` in
`apps/<product>-agent/.env`). Local data can be reset with
`db:clear:local:<product>`.

## Production setup (per product)

```bash
# 1. D1 database (fill database_id into wrangler.jsonc for the product env)
wrangler d1 create <product>-agent-memory
pnpm --filter @repo/memory-worker db:apply:remote:<product>

# 2. Vectorize index for semantic recall (dimensions match bge-base-en-v1.5)
wrangler vectorize create <index-name-from-wrangler.jsonc> --dimensions=768 --metric=cosine
# REQUIRED: retrieval filters matches by userId; without this metadata index
# every query errors and semantic recall silently degrades to recent turns.
wrangler vectorize create-metadata-index <index-name> --property-name=userId --type=string

# 3. Deploy
pnpm --filter @repo/memory-worker deploy:<product>

# 4. Cloudflare Access service token in front of the deployed worker; put the
#    pair into the agent server's CF_ACCESS_CLIENT_ID/CF_ACCESS_CLIENT_SECRET.
```

## Security notes

- Deployed workers require Cloudflare Access (`cf-access-jwt-assertion`);
  only the `-offline` envs set `REQUIRE_CF_ACCESS=false` for local dev.
- Reads never cross tenants: every query binds the caller-supplied
  `user_id`, and the agent derives it from the verified Firebase token.
- `POST /v1/checkpoints/delete-thread` accepts a missing `userId` (the
  LangGraph saver contract only carries `threadId`). Deletion without it can
  only destroy data, never read it; agent callers that know the user still
  pass it to keep the blast radius scoped.
- `DELETE /v1/threads` and `DELETE /v1/users` remove the full scope in one
  atomic batch: turns, titles, checkpoints, checkpoint writes, and thread
  metadata.
