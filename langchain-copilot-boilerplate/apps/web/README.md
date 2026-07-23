# @repo/web

Vite + React product frontend: a full-window CopilotKit chat that talks to the
BFF (`apps/bff`) **directly from the browser** — no proxy routes,
no server session, no `firebase-admin`.

## How it works

1. The user signs in with Google via the Firebase **client** SDK; the session
   lives in the SDK (IndexedDB), not in cookies.
2. `AuthProvider` subscribes to `onIdTokenChanged`, so React state always
   holds a fresh Firebase ID token (the SDK rotates it before the ~1h expiry).
3. `CopilotKitProvider` mounts CopilotKit pointed at
   `VITE_COPILOT_RUNTIME_URL` and keeps the `Authorization: Bearer`
   header in sync with token rotation via `copilotkit.setHeaders()`.
4. The BFF verifies the token (and `ALLOWED_EMAIL_DOMAINS`) on every
   request before anything reaches LangGraph.

Auth enforcement lives in the BFF — this app only provides the sign-in UX.
An account outside the allowed domains signs in here but gets 403 from the
BFF.

## Run

```bash
cp .env.example .env   # set VITE_FIREBASE_* (same Firebase project as the BFF)
pnpm dev               # from the repo root: bff + web
pnpm --filter @repo/web dev   # web only (bff must run separately)
```

Requires the BFF on `http://localhost:4000` with this origin in its
`CORS_ORIGINS` (the default `.env.example` already allows
`http://localhost:3000`).

## Deploy to Cloudflare Pages

When the Cloudflare project uses `langchain-copilot-boilerplate` as its root
directory, configure:

- Build command: `pnpm build:web`
- Build output directory: `apps/web/dist`

If the Cloudflare project root directory is instead `apps/web`, use
`pnpm build` and `dist`.

Add every required `VITE_*` value from `.env.example` to the Cloudflare Pages
build environment. These values are embedded into the browser bundle at build
time. Also add the deployed Pages origin to the BFF's `CORS_ORIGINS`.

## Layout

```
src/
  main.tsx / App.tsx   entry + single-route login gate → chat
  index.css            Tailwind + CopilotKit styles
  components/
    auth/              auth-provider (Firebase session + ID token), login-screen
    chat/              chat-view (full-window CopilotChat v2)
    history/           thread sidebar, list provider, hydrator
    preview/           optional side panel
    providers/         providers stack, copilot-kit-provider (+ auth token sync)
  hooks/               useRealtimeSync (WebSocket fan-in)
  services/websocket/  realtime client, reconnect, event reducer
  lib/                 config (runtime URL, agent id, WS URL), firebase, agent-api
```

## Optional realtime sync

Set `VITE_REALTIME_WS_URL=ws://localhost:8789/ws` and run
`pnpm --filter @repo/realtime-worker dev`. After sign-in the app opens a
WebSocket (token as `?token=`), updates the thread list from push events, and
refetches the active transcript on `MESSAGE_CREATED` from other sessions.
