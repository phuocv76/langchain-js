# @repo/web

Next.js product frontend: a full-window CopilotKit chat that talks to the
agent runtime (`apps/agent`) **directly from the browser** — no proxy routes,
no server session, no `firebase-admin`.

## How it works

1. The user signs in with Google via the Firebase **client** SDK; the session
   lives in the SDK (IndexedDB), not in cookies.
2. `AuthProvider` subscribes to `onIdTokenChanged`, so React state always
   holds a fresh Firebase ID token (the SDK rotates it before the ~1h expiry).
3. `CopilotKitProvider` mounts CopilotKit pointed at
   `NEXT_PUBLIC_COPILOT_RUNTIME_URL` and keeps the `Authorization: Bearer`
   header in sync with token rotation via `copilotkit.setHeaders()`.
4. The agent verifies the token (and `ALLOWED_EMAIL_DOMAINS`) on every
   request before anything reaches LangGraph.

Auth enforcement lives in the agent — this app only provides the sign-in UX.
An account outside the allowed domains signs in here but gets 403 from the
agent.

## Run

```bash
cp .env.example .env   # set NEXT_PUBLIC_FIREBASE_* (same Firebase project as the agent)
pnpm dev               # from the repo root: agent + web
pnpm --filter @repo/web dev   # web only (agent must run separately)
```

Requires the agent on `http://localhost:4000` with this origin in its
`CORS_ORIGINS` (the default `.env.example` already allows
`http://localhost:3000`).

## Layout

```
src/
  app/            layout, single-route page (login gate → chat), globals.css
  components/
    auth/         auth-provider (Firebase session + ID token), login-screen
    chat/         chat-view (full-window CopilotChat v2)
    providers/    providers stack, copilot-kit-provider (+ auth token sync)
  lib/            config (runtime URL, agent id), firebase (client singletons)
```
