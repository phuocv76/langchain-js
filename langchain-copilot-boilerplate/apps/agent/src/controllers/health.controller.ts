// Libs for third party
import type { Context } from 'hono';

// Types
import type { HealthStatus } from '@repo/types';

/** Handles `GET /health` with a simple liveness payload. */
export const handleHealth = (c: Context): Response => {
  const payload: HealthStatus = {
    status: 'ok',
    service: '@repo/agent',
    uptimeSeconds: Math.round(process.uptime()),
  };

  return c.json(payload);
};
