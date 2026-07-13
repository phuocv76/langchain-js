import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveTrustedContext } from '../durable-memory.js';

describe('durable memory trusted context', () => {
  it('accepts only the sanitized claim headers forwarded by CopilotKit', () => {
    const context = resolveTrustedContext({
      config: {
        configurable: {
          thread_id: 'thread-1',
          copilotkit_forwarded_headers: {
            'x-agent-request-id': 'request-1',
            'x-agent-user-id': 'user-1',
            'x-agent-tenant-id': 'tenant-1',
            'x-agent-roles': encodeURIComponent('["member"]'),
            'x-agent-user-token': 'must-not-be-read',
          },
        },
      },
    });

    assert.deepEqual(context, {
      requestId: 'request-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      roles: ['member'],
      threadId: 'thread-1',
    });
  });

  it('rejects malformed or incomplete forwarded claims', () => {
    assert.equal(
      resolveTrustedContext({
        config: { configurable: { thread_id: 'thread-1' } },
      }),
      undefined,
    );
  });
});
