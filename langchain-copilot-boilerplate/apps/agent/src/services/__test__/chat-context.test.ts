import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildRestCopilotKitState } from '../chat-context.js';

describe('REST CopilotKit context adapter', () => {
  it('omits empty context', () => {
    assert.equal(buildRestCopilotKitState(undefined), undefined);
    assert.equal(buildRestCopilotKitState({}), undefined);
  });

  it('serializes request context for the agent', () => {
    const state = buildRestCopilotKitState({ locale: 'en', channel: 'web' });

    assert.deepEqual(state?.copilotkit.context, [
      {
        description: 'REST API request context',
        value: '{"locale":"en","channel":"web"}',
      },
    ]);
  });
});
