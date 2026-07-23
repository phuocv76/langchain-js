import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { productEnvSchema } from '../env.js';

describe('product environment schema', () => {
  it('accepts a product API base URL', () => {
    const result = productEnvSchema.safeParse({
      API_BASE_URL: 'https://api.example.com',
    });

    assert.equal(result.success, true);
  });

  it('bounds product API calls with a default timeout', () => {
    const result = productEnvSchema.safeParse({});

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.API_TIMEOUT_MS, 10_000);
    }
  });

  it('rejects a malformed product API base URL', () => {
    assert.equal(
      productEnvSchema.safeParse({ API_BASE_URL: 'not-a-url' }).success,
      false,
    );
  });
});
