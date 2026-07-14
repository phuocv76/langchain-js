// Libs for third party
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';

// Internal
import { corsOrigins } from '@agent/config/env.js';
import { handleCopilotKitRequest } from '@agent/copilotkit.js';
import { errorHandler } from '@agent/middleware/error.js';
import { requireAgentUser } from '@agent/middleware/agent-user-auth.js';
import { requireRuntimeSecret } from '@agent/middleware/runtime-auth.js';
import { chatRoute } from '@agent/routes/chat.route.js';
import { healthRoute } from '@agent/routes/health.route.js';
import { memoryRoute } from '@agent/routes/memory.route.js';

export const app = new Hono();

app.use('*', honoLogger());
app.use('*', cors({
  origin: corsOrigins,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-CopilotCloud-Public-Api-Key', 'x-user-id', 'x-user-name', 'x-agent-user-token'],
}));
app.onError(errorHandler);

app.use('/chat', requireRuntimeSecret);
app.use('/chat/*', requireRuntimeSecret);
app.use('/copilotkit', requireRuntimeSecret);
app.use('/copilotkit/*', requireRuntimeSecret);
app.use('/copilotkit', requireAgentUser);
app.use('/copilotkit/*', requireAgentUser);
app.use('/memory', requireRuntimeSecret);
app.use('/memory/*', requireRuntimeSecret);
app.use('/memory', requireAgentUser);
app.use('/memory/*', requireAgentUser);

app.route('/health', healthRoute);
app.route('/chat', chatRoute);
app.route('/memory', memoryRoute);
app.all('/copilotkit', (c) => handleCopilotKitRequest(c.req.raw));
app.all('/copilotkit/*', (c) => handleCopilotKitRequest(c.req.raw));
