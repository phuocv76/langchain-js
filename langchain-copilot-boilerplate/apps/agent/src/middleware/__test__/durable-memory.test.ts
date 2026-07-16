import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AIMessage, HumanMessage, isHumanMessage } from '@langchain/core/messages';

import { latestTurn, resolveTrustedContext } from '../durable-memory.js';

describe('durable memory trusted context', () => {
  it('accepts the sanitized x-agent-* claims copied into configurable', () => {
    // The LangGraph server copies each x-* request header into the run
    // configurable, which middleware hooks receive as runtime.configurable.
    const context = resolveTrustedContext({
      configurable: {
        thread_id: 'thread-1',
        'x-agent-request-id': 'request-1',
        'x-agent-user-id': 'user-1',
        'x-agent-user-email': 'user-1@asnet.com.vn',
        'x-agent-roles': encodeURIComponent('["member"]'),
        'user-agent': 'node',
      },
    });

    assert.deepEqual(context, {
      requestId: 'request-1',
      userId: 'user-1',
      email: 'user-1@asnet.com.vn',
      roles: ['member'],
      threadId: 'thread-1',
    });
  });

  it('rejects claims missing the acting-user email', () => {
    assert.equal(
      resolveTrustedContext({
        configurable: {
          thread_id: 'thread-1',
          'x-agent-request-id': 'request-1',
          'x-agent-user-id': 'user-1',
          'x-agent-roles': encodeURIComponent('["member"]'),
        },
      }),
      undefined,
    );
  });

  it('rejects malformed or incomplete forwarded claims', () => {
    assert.equal(
      resolveTrustedContext({
        configurable: { thread_id: 'thread-1' },
      }),
      undefined,
    );
  });
});

describe('durable memory latest turn', () => {
  it('returns the newest matching message with its engine-assigned id', () => {
    const turn = latestTurn(
      [
        new HumanMessage({ id: 'msg-1', content: 'first question' }),
        new AIMessage({ id: 'msg-2', content: 'first answer' }),
        new HumanMessage({ id: 'msg-3', content: 'second question' }),
      ],
      isHumanMessage,
    );

    assert.deepEqual(turn, { messageId: 'msg-3', content: 'second question' });
  });

  it('extracts text from content-block messages', () => {
    const turn = latestTurn(
      [
        new HumanMessage({
          id: 'msg-1',
          content: [{ type: 'text', text: 'block question' }],
        }),
      ],
      isHumanMessage,
    );

    assert.deepEqual(turn, { messageId: 'msg-1', content: 'block question' });
  });

  it('returns undefined when no message matches', () => {
    assert.equal(
      latestTurn([new AIMessage({ id: 'msg-1', content: 'answer' })], isHumanMessage),
      undefined,
    );
  });
});
