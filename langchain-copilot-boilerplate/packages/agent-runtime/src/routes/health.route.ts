// Libs for third party
import { Hono } from 'hono';

// Internal
import { createHealthHandler } from '../controllers/health.controller.js';

/** `GET /health` — liveness probe reporting the given service name. */
export const createHealthRoute = (service: string): Hono =>
  new Hono().get('/', createHealthHandler(service));
