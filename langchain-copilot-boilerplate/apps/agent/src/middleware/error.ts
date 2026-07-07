// Libs for third party
import type { Context } from 'hono';

// Internal
import { logger } from '../utils/logger.js';

/** Central error handler mapping thrown errors to JSON responses. */
export const errorHandler = (err: Error, c: Context): Response => {
  logger.error('unhandled error', err);
  return c.json({ ok: false, error: err.message || 'Internal error' }, 500);
};
