// Internal
import { createApp } from './app/create-app.js';
import { createCopilotKitHandler } from './copilotkit.js';
import { createD1Stores } from './stores/d1.js';
import type { Env } from './types/env.js';

const COPILOT_PREFIX = '/api/copilotkit';

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const pathname = new URL(request.url).pathname;

    if (
      pathname === COPILOT_PREFIX ||
      pathname.startsWith(`${COPILOT_PREFIX}/`)
    ) {
      const deploymentUrl =
        env.LANGGRAPH_DEPLOYMENT_URL?.trim() || 'http://localhost:2024';
      return createCopilotKitHandler(deploymentUrl)(request);
    }

    const corsOrigins = (env.CORS_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    const app = createApp({
      stores: createD1Stores(env.DB),
      corsOrigins,
      readOpenAiKey: () => env.OPENAI_API_KEY?.trim() || null,
    });

    return app.fetch(request);
  },
};
