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

Public vars (see repo-root `.env.example`):

- `NEXT_PUBLIC_COPILOT_RUNTIME_URL` — defaults to `http://localhost:4000/copilotkit`.
- `NEXT_PUBLIC_AGENT_ID` — must match a graph id in `apps/agent/langgraph.json`.
