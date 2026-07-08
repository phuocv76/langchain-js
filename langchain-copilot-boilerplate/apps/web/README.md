# @repo/web

Next.js (App Router) + CopilotKit ChatGPT-style frontend.

## Features

- CopilotKit `CopilotChat` UI: history, streaming, auto-scroll, loading, input.
- Suggested prompt chips (`src/components/chat/suggested-prompts.tsx`).
- Client **Theme Agent** (`src/agents/theme-agent.tsx`) — a `useFrontendTool`
  that switches light/dark/system via next-themes.
- Tailwind CSS + shadcn/ui tokens, responsive layout.

## Layout

```
src/
  app/
    layout.tsx     ThemeProvider + CopilotKit provider
    page.tsx       header + chat
    globals.css    Tailwind + shadcn tokens + CopilotKit styles
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

- `NEXT_PUBLIC_COPILOT_RUNTIME_URL` — defaults to `http://localhost:4000/copilotkit`.
- `NEXT_PUBLIC_AGENT_ID` — must match a graph id in `apps/agent/langgraph.json`.
- `NEXT_PUBLIC_COPILOTKIT_PUBLIC_LICENSE_KEY` — public license for sidebar history (Intelligence).
- `NEXT_PUBLIC_FIREBASE_*` + `FIREBASE_*` — Google Sign-In via Firebase Authentication.

Server-side Intelligence vars (`INTELLIGENCE_*`, `COPILOTKIT_LICENSE_TOKEN`) belong in
**`apps/agent/.env`**, not here.
