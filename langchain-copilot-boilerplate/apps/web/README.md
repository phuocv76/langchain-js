# @repo/web

Next.js (App Router) + CopilotKit ChatGPT-style frontend.

## Features

- CopilotKit `CopilotChat` UI: history, streaming, auto-scroll, loading, input.
- Suggested prompt chips (`src/components/chat/suggested-prompts.tsx`).
- Client **Theme Agent** (`src/agents/theme-agent.tsx`) — a `useFrontendTool`
  that switches light/dark/system via next-themes.
- Tailwind CSS + shadcn/ui tokens, responsive layout.
- Firebase-signed, HTTP-only server sessions and a same-origin authenticated
  `/api/copilotkit` proxy.

## Layout

```
src/
  app/
    layout.tsx                  ThemeProvider + auth provider
    chat/page.tsx               authenticated chat workspace
    api/copilotkit/[[...path]]  verified runtime proxy
    globals.css                 Tailwind + shadcn tokens + CopilotKit styles
  agents/
    theme-agent.tsx   client setTheme frontend tool
  components/
    providers/     Providers (theme + CopilotKit)
    chat/          ChatView, SuggestedPrompts
    theme/         ThemeToggle
    layout/        AppHeader
  lib/config.ts    AGENT_ID + runtime URL
```

## Environment

Variables live in **`apps/web/.env`** (see `.env.example` in this directory).
Next.js loads that file automatically when you run `pnpm dev` from the monorepo root.

- `NEXT_PUBLIC_COPILOT_RUNTIME_URL` — defaults to the authenticated `/api/copilotkit` proxy.
- `COPILOT_AGENT_RUNTIME_URL` — server-only Hono runtime URL, default `http://localhost:4000/copilotkit`.
- `COPILOT_RUNTIME_SECRET` — server-only shared secret; required in production and must match the agent app.
- `NEXT_PUBLIC_AGENT_ID` — must match a graph id in `apps/agent/langgraph.json`.
- `NEXT_PUBLIC_FIREBASE_*` + `FIREBASE_*` — Google Sign-In via Firebase Authentication.

Server-side D1 memory Worker credentials belong in **`apps/agent/.env`**, not here.
