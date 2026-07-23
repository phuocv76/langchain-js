// Libs for third party
import type { Context } from 'hono';

// Types
import type { HealthStatus } from '@repo/shared';

/** Builds a `GET /health` handler with a simple liveness payload. */
export const createHealthHandler =
  (service: string) =>
  (c: Context): Response => {
    const payload: HealthStatus = {
      status: 'ok',
      service,
      uptimeSeconds: Math.round(process.uptime()),
    };

    return c.json(payload);
  };
