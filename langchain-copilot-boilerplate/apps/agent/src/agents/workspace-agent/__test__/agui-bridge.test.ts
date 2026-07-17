import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Message, RunAgentInput } from '@ag-ui/core';
import { isHumanMessage, isToolMessage } from '@langchain/core/messages';

import { buildCopilotKitState, newTurnMessages } from '../agui-bridge.js';

const transcript: Message[] = [
  { id: 'u1', role: 'user', content: 'first question' },
  { id: 'a1', role: 'assistant', content: 'first answer' },
  { id: 'u2', role: 'user', content: 'second question' },
];

describe('agui bridge input mapping', () => {
  it('sends only the messages after the last assistant turn', () => {
    const messages = newTurnMessages(transcript);
    assert.equal(messages.length, 1);
    assert.ok(isHumanMessage(messages[0]!));
    assert.equal(messages[0]!.id, 'u2');
    assert.equal(messages[0]!.content, 'second question');
  });

  it('keeps frontend tool results in the new turn', () => {
    const messages = newTurnMessages([
      ...transcript.slice(0, 2),
      { id: 't1', role: 'tool', content: '{"ok":true}', toolCallId: 'call-1' },
      { id: 'u2', role: 'user', content: 'and now?' },
    ]);
    assert.equal(messages.length, 2);
    assert.ok(isToolMessage(messages[0]!));
    assert.equal(
      (messages[0] as { tool_call_id: string }).tool_call_id,
      'call-1',
    );
    assert.ok(isHumanMessage(messages[1]!));
  });

  it('sends nothing when the transcript ends with the assistant', () => {
    assert.deepEqual(newTurnMessages(transcript.slice(0, 2)), []);
  });

  it('normalizes frontend tools and context into copilotkit state', () => {
    const input = {
      tools: [
        {
          name: 'sayHello',
          description: 'Greets someone',
          parameters: { type: 'object', properties: {} },
        },
      ],
      context: [{ description: 'page', value: 'dashboard' }],
    } as unknown as RunAgentInput;

    const state = buildCopilotKitState(input);
    assert.deepEqual(state.copilotkit.actions, [
      {
        type: 'function',
        name: 'sayHello',
        function: {
          name: 'sayHello',
          description: 'Greets someone',
          parameters: { type: 'object', properties: {} },
        },
      },
    ]);
    assert.deepEqual(state.copilotkit.context, [
      { description: 'page', value: 'dashboard' },
    ]);
    assert.deepEqual(state.copilotkit.interceptedToolCalls, []);
  });
});
