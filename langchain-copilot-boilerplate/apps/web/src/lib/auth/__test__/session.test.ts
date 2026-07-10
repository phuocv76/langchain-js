import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSessionFromFirebase,
  isRecentFirebaseSignIn,
} from '../session.js';

describe('Firebase session helpers', () => {
  it('maps verified Firebase claims to the application session', () => {
    assert.deepEqual(
      createSessionFromFirebase({
        uid: 'user-1',
        email: 'user@example.com',
        name: 'User',
        picture: 'https://example.com/avatar.png',
      }),
      {
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        photoURL: 'https://example.com/avatar.png',
      },
    );
  });

  it('accepts only recent sign-ins', () => {
    const now = 1_000_000;
    assert.equal(isRecentFirebaseSignIn(now / 1000 - 60, now), true);
    assert.equal(isRecentFirebaseSignIn(now / 1000 - 301, now), false);
  });
});
