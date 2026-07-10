import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Hono } from 'hono';

import { createRuntimeSecretMiddleware } from '../runtime-auth.js';

const SECRET = '0123456789abcdef0123456789abcdef';

const createApp = (secret: string | undefined): Hono => {
  const app = new Hono();
  app.use('*', createRuntimeSecretMiddleware(secret));
  app.get('/', (context) => context.json({ ok: true }));
  return app;
};

describe('runtime shared-secret middleware', () => {
  it('rejects a missing secret header when protection is configured', async () => {
    const response = await createApp(SECRET).request('/');
    assert.equal(response.status, 401);
  });

  it('accepts the matching bearer secret', async () => {
    const response = await createApp(SECRET).request('/', {
      headers: { authorization: `Bearer ${SECRET}` },
    });
    assert.equal(response.status, 200);
  });

  it('allows unprotected local development', async () => {
    const response = await createApp(undefined).request('/');
    assert.equal(response.status, 200);
  });
});
