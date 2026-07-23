// Libs for third party
import type { Context } from 'hono';

// Internal
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/** Central error handler mapping thrown errors to JSON responses. */
export const errorHandler = (err: Error, c: Context): Response => {
  logger.error('unhandled error', err);
  const message =
    env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';
  return c.json({ ok: false, error: message }, 500);
};
