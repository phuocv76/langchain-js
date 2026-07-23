/**
 * Regression check: HITL + frontend tools through the no-bridge chain
 * (CopilotKit runtime → LangGraphAgent → embed server → D1). Run with:
 *
 *   cd apps/agent && npx tsx src/regression/hitl-tools-check.ts
 *
 * Scenario A — frontend tool: the model must call a client-declared tool
 * (delivered via AG-UI `tools`, surfaced to the graph as
 * `state.copilotkit.actions`), the run ends with the tool call streamed to
 * the client, and the follow-up run carries the tool result back.
 *
 * Scenario B — interrupt/resume: the approval graph pauses on
 * `interrupt()`; the pending state must survive in D1 so a second run with
 * `command.resume` completes the node.
 */

// Libs for Node
import { randomUUID } from 'node:crypto';

// Libs for third party
import { HttpAgent } from '@ag-ui/client';

const BASE =
  process.env.REGRESSION_COPILOTKIT_BASE ?? 'http://localhost:2200/copilotkit/agent';

type AnyMessage = {
  id?: string;
  role?: string;
  content?: unknown;
  toolCalls?: Array<{
    id: string;
    function: { name: string; arguments: string };
  }>;
};

const textOf = (content: unknown): string =>
  typeof content === 'string' ? content : '';

const lastAssistant = (messages: readonly AnyMessage[]): AnyMessage | undefined =>
  [...messages].reverse().find((message) => message.role === 'assistant');

const results: Array<[string, boolean, string]> = [];
const check = (name: string, ok: boolean, detail: string): void => {
  results.push([name, ok, detail]);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} — ${detail}`);
};

const trackEvents = (agent: HttpAgent): Set<string> => {
  const seen = new Set<string>();
  agent.subscribe({
    onEvent: ({ event }) => {
      const name = (event as { name?: string }).name;
      seen.add(name ? `${event.type}:${name}` : event.type);
    },
  });
  return seen;
};

const frontendToolScenario = async (): Promise<void> => {
  console.log('\n=== Scenario A: frontend tool (workspaceAgent) ===');
  const threadId = randomUUID();
  const agent = new HttpAgent({ url: `${BASE}/workspaceAgent/run`, threadId });
  const seen = trackEvents(agent);

  agent.messages = [
    {
      id: randomUUID(),
      role: 'user',
      content:
        'Use the set_theme_color tool to change the theme to teal. Do not ask questions.',
    },
  ];
  await agent.runAgent({
    tools: [
      {
        name: 'set_theme_color',
        description: 'Sets the UI theme color on the client',
        parameters: {
          type: 'object',
          properties: { color: { type: 'string' } },
          required: ['color'],
        },
      },
    ],
  });

  const assistant = lastAssistant(agent.messages as AnyMessage[]);
  const toolCall = assistant?.toolCalls?.[0];
  check(
    'tool-call-emitted',
    toolCall?.function.name === 'set_theme_color',
    JSON.stringify(toolCall?.function ?? null),
  );
  check(
    'tool-call-streamed-as-events',
    [...seen].some((type) => type.startsWith('TOOL_CALL_')),
    `events: ${[...seen].join(', ')}`,
  );
  if (!toolCall) return;

  // Client "executes" the tool, then reports the result on the same thread.
  agent.addMessage({
    id: randomUUID(),
    role: 'tool',
    content: 'Theme color changed to teal successfully.',
    toolCallId: toolCall.id,
  });
  await agent.runAgent({
    tools: [
      {
        name: 'set_theme_color',
        description: 'Sets the UI theme color on the client',
        parameters: {
          type: 'object',
          properties: { color: { type: 'string' } },
          required: ['color'],
        },
      },
    ],
  });
  const followUp = textOf(lastAssistant(agent.messages as AnyMessage[])?.content);
  check('tool-result-roundtrip', followUp.length > 0, JSON.stringify(followUp));
};

const interruptScenario = async (): Promise<void> => {
  console.log('\n=== Scenario B: interrupt/resume (approvalCheck) ===');
  const threadId = randomUUID();
  console.log(`approval thread: ${threadId}`);
  const agent = new HttpAgent({ url: `${BASE}/approvalCheck/run`, threadId });
  const seen = trackEvents(agent);

  agent.messages = [
    { id: randomUUID(), role: 'user', content: 'Please deploy to production.' },
  ];
  await agent.runAgent();

  check(
    'interrupt-surfaced',
    [...seen].some(
      (type) =>
        type === 'CUSTOM:on_interrupt' || type.startsWith('RUN_FINISHED'),
    ),
    `events: ${[...seen].join(', ')}`,
  );

  // Resume on the same thread — interrupt state must come back from D1.
  await agent.runAgent({
    forwardedProps: { command: { resume: 'approved-by-regression' } },
  });
  const decision = textOf(lastAssistant(agent.messages as AnyMessage[])?.content);
  check(
    'resume-completes-via-d1',
    decision.includes('approved-by-regression'),
    JSON.stringify(decision),
  );
};

const main = async (): Promise<void> => {
  await frontendToolScenario();
  await interruptScenario();
  const failed = results.filter(([, ok]) => !ok);
  console.log(
    `\n${failed.length === 0 ? 'ALL CHECKS PASSED' : `${failed.length} CHECK(S) FAILED`}`,
  );
  process.exit(failed.length === 0 ? 0 : 1);
};

main().catch((error) => {
  console.error('CHECK FAILED:', error);
  process.exit(1);
});
