import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { envSchema } from '../env.js';

describe('agent environment schema', () => {
  it('accepts local defaults', () => {
    assert.equal(envSchema.safeParse({ NODE_ENV: 'test' }).success, true);
  });

  it('leaves LangGraph deployment URL optional (Studio only)', () => {
    const result = envSchema.safeParse({ NODE_ENV: 'test' });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.LANGGRAPH_DEPLOYMENT_URL, undefined);
    }
  });

  it('accepts a bare memory worker URL for local development', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'test',
      MEMORY_WORKER_URL: 'http://localhost:8788',
    });

    assert.equal(result.success, true);
  });

  it('rejects a lone Cloudflare Access credential', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'test',
      MEMORY_WORKER_URL: 'https://memory.example.com',
      CF_ACCESS_CLIENT_ID: 'client-id',
    });

    assert.equal(result.success, false);
  });

  it('rejects Cloudflare Access credentials without a memory worker URL', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'test',
      CF_ACCESS_CLIENT_ID: 'client-id',
      CF_ACCESS_CLIENT_SECRET: 'client-secret',
    });

    assert.equal(result.success, false);
  });

  it('accepts a product API base URL without a service token', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'test',
      API_BASE_URL: 'https://api.example.com',
    });

    assert.equal(result.success, true);
  });

  it('rejects a lone realtime worker URL or secret', () => {
    assert.equal(
      envSchema.safeParse({
        NODE_ENV: 'test',
        REALTIME_WORKER_URL: 'http://localhost:8789',
      }).success,
      false,
    );
    assert.equal(
      envSchema.safeParse({
        NODE_ENV: 'test',
        REALTIME_PUBLISH_SECRET: 'secret',
      }).success,
      false,
    );
  });
});
