import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getDefaultFirebaseClaims,
  hasRequiredFirebaseClaims,
  readFirebaseRoles,
} from '../firebase-claims.js';

describe('Firebase custom claims helpers', () => {
  it('detects required tenant and role claims', () => {
    assert.equal(
      hasRequiredFirebaseClaims({
        tenant_id: 'tenant-1',
        roles: ['member'],
      }),
      true,
    );
    assert.equal(hasRequiredFirebaseClaims({ tenant_id: 'tenant-1' }), false);
    assert.equal(hasRequiredFirebaseClaims({ roles: ['member'] }), false);
  });

  it('rejects malformed role arrays', () => {
    assert.deepEqual(readFirebaseRoles(['member']), ['member']);
    assert.equal(readFirebaseRoles(['member', 1]), undefined);
  });

  it('returns default claims for first-time sign-in provisioning', () => {
    assert.deepEqual(getDefaultFirebaseClaims(), {
      tenant_id: 'default',
      roles: ['member'],
    });
  });
});
