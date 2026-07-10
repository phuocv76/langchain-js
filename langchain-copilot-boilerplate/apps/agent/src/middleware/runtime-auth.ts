// Libs for Node
import { timingSafeEqual } from 'node:crypto';

// Libs for third party
import type { MiddlewareHandler } from 'hono';

// Internal
import { env } from '@agent/config/env.js';

const isEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
};

/** Builds endpoint protection for the Next.js server-to-server proxy. */
export const createRuntimeSecretMiddleware =
  (secret: string | undefined): MiddlewareHandler =>
  async (context, next) => {
    if (!secret) {
      await next();
      return;
    }

    const expected = `Bearer ${secret}`;
    const received = context.req.header('authorization') ?? '';

    if (!isEqual(received, expected)) {
      return context.json({ ok: false, error: 'Unauthorized' }, 401);
    }

    await next();
  };

/** Protects agent execution endpoints behind the Next.js server proxy. */
export const requireRuntimeSecret = createRuntimeSecretMiddleware(
  env.COPILOT_RUNTIME_SECRET,
);
