import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertUserVerificationConfigured, envSchema } from '../env.js';

const PRODUCTION_FIREBASE = {
  NODE_ENV: 'production',
  FIREBASE_PROJECT_ID: 'demo-project',
  FIREBASE_CLIENT_EMAIL: 'svc@demo-project.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
};

describe('agent environment schema', () => {
  it('accepts local defaults', () => {
    assert.equal(envSchema.safeParse({ NODE_ENV: 'test' }).success, true);
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

  it('rejects partial product API configuration', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'test',
      API_BASE_URL: 'https://api.example.com',
    });

    assert.equal(result.success, false);
  });

  it('accepts a complete product API configuration', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'test',
      API_BASE_URL: 'https://api.example.com',
      API_SERVICE_TOKEN: 'service-token',
    });

    assert.equal(result.success, true);
  });

  it('lets the graph process run in production without Firebase', () => {
    // The agent library may import env under NODE_ENV=production (e.g. when
    // bundled into the BFF) but only the BFF bootstrap asserts Firebase.
    const result = envSchema.safeParse({ NODE_ENV: 'production' });
    assert.equal(result.success, true);
  });

  it('blocks the user-facing runtime in production without Firebase', () => {
    const candidate = envSchema.parse({ NODE_ENV: 'production' });
    assert.throws(() => assertUserVerificationConfigured(candidate), /FIREBASE/);
  });

  it('accepts a complete production configuration for the runtime', () => {
    const candidate = envSchema.parse(PRODUCTION_FIREBASE);
    assert.doesNotThrow(() => assertUserVerificationConfigured(candidate));
  });

  it('rejects a lone realtime worker URL without a publish secret', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'test',
      REALTIME_WORKER_URL: 'http://localhost:8789',
    });
    assert.equal(result.success, false);
  });

  it('accepts matching realtime worker URL and publish secret', () => {
    const result = envSchema.safeParse({
      NODE_ENV: 'test',
      REALTIME_WORKER_URL: 'http://localhost:8789',
      REALTIME_PUBLISH_SECRET: 'dev-secret',
    });
    assert.equal(result.success, true);
  });
});
