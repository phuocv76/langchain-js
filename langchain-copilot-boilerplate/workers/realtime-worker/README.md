# @repo/realtime-worker

Cloudflare Worker + Durable Objects gateway for cross-session chat sync.

One codebase, **one deployment per product** (wrangler envs `space` /
`kitchen`, same model as the memory worker). Durable Objects are keyed by
Firebase `uid` only, so products must not share a deployment — a user with
two products open would receive one product's thread events in the other's
sidebar.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | none | Liveness |
| GET | `/ws` | Firebase ID token (`Authorization: Bearer` or `?token=`) | Browser WebSocket |
| POST | `/publish` | `REALTIME_PUBLISH_SECRET` | Agent event fan-out |

One Durable Object (`UserHub`) is created per Firebase `uid` and holds all
live sockets for that user.

Auth policy note: `/ws` accepts any verified-email Firebase account of the
configured project — unlike the agent server it does not enforce
`ALLOWED_EMAIL_DOMAINS`. This is deliberate: a socket only ever receives the
authenticated user's own events, so domain filtering adds nothing here.

## Local development

```bash
cp .dev.vars.sample .dev.vars.space
# set FIREBASE_PROJECT_ID + REALTIME_PUBLISH_SECRET

pnpm --filter @repo/realtime-worker dev:space     # http://localhost:8789
pnpm --filter @repo/realtime-worker dev:kitchen   # http://localhost:8791
```

Point the product's agent server at its worker:

```bash
# apps/space-agent/.env
REALTIME_WORKER_URL=http://localhost:8789
REALTIME_PUBLISH_SECRET=dev-realtime-publish-secret-change-me
```

And the product frontend:

```bash
# frontend repo (langchain-copilot-web) .env
VITE_REALTIME_WS_URL=ws://localhost:8789/ws
```

## Deploy

```bash
pnpm --filter @repo/realtime-worker deploy:space    # worker: agent-realtime-space
pnpm --filter @repo/realtime-worker deploy:kitchen  # worker: agent-realtime-kitchen
# per deployment:
# wrangler secret put REALTIME_PUBLISH_SECRET --env <product>
# wrangler secret put FIREBASE_PROJECT_ID --env <product>  (or set as var)
```
