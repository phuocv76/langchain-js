// Libs for third party
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

// Internal
import { createApp } from './app/create-app.js';
import { createCopilotKitHandler } from './copilotkit.js';
import { getDatabase } from './db/client.js';
import { createSqliteStores } from './stores/sqlite.js';

const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const db = getDatabase();
const restApp = createApp({
  stores: createSqliteStores(db),
  corsOrigins,
  readOpenAiKey: () => process.env.OPENAI_API_KEY?.trim() || null,
});

const deploymentUrl =
  process.env.LANGGRAPH_DEPLOYMENT_URL ?? 'http://localhost:2024';
const handleCopilotKitRequest = createCopilotKitHandler(deploymentUrl);

const app = new Hono();

app.route('/', restApp);
app.all('/api/copilotkit', (c) => handleCopilotKitRequest(c.req.raw));
app.all('/api/copilotkit/*', (c) => handleCopilotKitRequest(c.req.raw));

const port = Number(process.env.BACKEND_PORT ?? process.env.PORT) || 4000;

serve({ fetch: app.fetch, port }, () => {
  console.log(`Backend ready at http://localhost:${port}`);
});
