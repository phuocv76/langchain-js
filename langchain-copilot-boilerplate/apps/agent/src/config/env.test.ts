import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { envSchema } from './env.js';

describe('agent environment schema', () => {
  it('accepts local defaults', () => {
    assert.equal(envSchema.safeParse({ NODE_ENV: 'test' }).success, true);
  });

  it('rejects partial Intelligence configuration', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'test',
      INTELLIGENCE_API_URL: 'https://api.example.com',
    });

    assert.equal(result.success, false);
  });

  it('requires a runtime secret in production', () => {
    const result = envSchema.safeParse({ NODE_ENV: 'production' });
    assert.equal(result.success, false);
  });

  it('accepts a complete protected production configuration', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'production',
      COPILOT_RUNTIME_SECRET: 'a'.repeat(32),
    });

    assert.equal(result.success, true);
  });
});
