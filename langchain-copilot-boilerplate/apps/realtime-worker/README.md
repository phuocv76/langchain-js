# @repo/realtime-worker

Cloudflare Worker + Durable Objects gateway for cross-session chat sync.

## Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | none | Liveness |
| GET | `/ws` | Firebase ID token (`Authorization: Bearer` or `?token=`) | Browser WebSocket |
| POST | `/publish` | `REALTIME_PUBLISH_SECRET` | Agent event fan-out |

One Durable Object (`LanchainBoilerplateHub`) is created per Firebase `uid` and holds all
live sockets for that user.

## Local development

```bash
cp .dev.vars.sample .dev.vars
# set FIREBASE_PROJECT_ID + REALTIME_PUBLISH_SECRET

pnpm --filter @repo/realtime-worker dev   # http://localhost:8789
```

Point the BFF at this worker:

```bash
# apps/bff/.env
REALTIME_WORKER_URL=http://localhost:8789
REALTIME_PUBLISH_SECRET=dev-realtime-publish-secret-change-me
```

And the web app:

```bash
# apps/web/.env
VITE_REALTIME_WS_URL=ws://localhost:8789/ws
```

## Deploy

```bash
pnpm --filter @repo/realtime-worker deploy
# wrangler secret put REALTIME_PUBLISH_SECRET
# wrangler secret put FIREBASE_PROJECT_ID  (or set as var)
```
