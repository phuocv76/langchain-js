// Libs for third party
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/**
 * Greeting tool.
 *
 * Returns a friendly greeting when the user says hi/hello/good morning, etc.
 * Implemented as a first-class LangChain tool so more tools can be added the
 * same way (drop a `*.tool.ts` file and register it in `tools/index.ts`).
 */
export const greetingTool = tool(
  async ({ name }): Promise<string> => {
    const who = name?.trim();
    return who
      ? `Hello, ${who}! How can I help you today?`
      : 'Hello! How can I help you today?';
  },
  {
    name: 'greeting',
    description:
      'Return a friendly greeting when the user greets the assistant ' +
      '(e.g. "hi", "hello", "hey", "good morning"). Optionally personalize ' +
      'it with the user name if they mention it.',
    schema: z.object({
      name: z
        .string()
        .optional()
        .describe('The user name, if they mention it.'),
    }),
  },
);
