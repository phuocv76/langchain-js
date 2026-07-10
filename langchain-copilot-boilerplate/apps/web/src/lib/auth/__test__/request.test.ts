import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isTrustedRequestOrigin } from '../request.js';

describe('request origin validation', () => {
  it('accepts same-origin browser requests', () => {
    const request = new Request('https://app.example.com/api/auth/login', {
      method: 'POST',
      headers: { origin: 'https://app.example.com' },
    });

    assert.equal(isTrustedRequestOrigin(request), true);
  });

  it('rejects cross-origin browser requests', () => {
    const request = new Request('https://app.example.com/api/auth/login', {
      method: 'POST',
      headers: { origin: 'https://attacker.example.com' },
    });

    assert.equal(isTrustedRequestOrigin(request), false);
  });
});
