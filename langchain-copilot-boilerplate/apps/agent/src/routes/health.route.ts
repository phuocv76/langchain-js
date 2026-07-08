// Libs for third party
import { Hono } from 'hono';

// Internal
import { handleHealth } from '@agent/controllers/health.controller.js';

/** `GET /health` — liveness probe. */
export const healthRoute = new Hono().get('/', handleHealth);
