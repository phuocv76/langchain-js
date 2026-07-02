// Libs for third party
import { tool } from '@langchain/core/tools';
import type { RunnableConfig } from '@langchain/core/runnables';
import { z } from 'zod';

// Internal
import { TOOL_MESSAGES } from '../../constants/messages.js';
import { readSessionContext } from '../../lib/api-client.js';

interface GreetUserResult {
  readonly greeting: string;
  readonly displayName: string;
  readonly role: 'admin' | 'member';
  readonly welcomeMessage: string;
  readonly suggestedPrompts: readonly string[];
}

const ADMIN_SUGGESTIONS = [
  'List all users',
  'Show my profile',
  'What fields can I edit?',
] as const;

const MEMBER_SUGGESTIONS = [
  'Show my profile',
  'Update my bio',
  'What is the password policy?',
] as const;

/** Builds a role-aware welcome payload for conversational greetings. */
const buildGreetingResponse = (
  session: ReturnType<typeof readSessionContext>,
  greeting: string,
): GreetUserResult => {
  const isAdmin = session.userRole === 'admin';
  const capabilities = isAdmin
    ? 'I can help you manage users, profiles, roles, and search the knowledge base.'
    : 'I can help you view and update your profile, look up users by email, and answer policy questions.';

  return {
    greeting,
    displayName: session.userName,
    role: session.userRole,
    welcomeMessage: `Hello, ${session.userName}! ${capabilities}`,
    suggestedPrompts: isAdmin ? ADMIN_SUGGESTIONS : MEMBER_SUGGESTIONS,
  };
};

/** Responds to hi/hello-style greetings with a personalized welcome. */
export const greetUserTool = tool(
  async ({ message }, config: RunnableConfig): Promise<GreetUserResult> => {
    const session = readSessionContext(config);
    const greeting = message?.trim() || 'Hello';

    return buildGreetingResponse(session, greeting);
  },
  {
    name: 'greet_user',
    description: TOOL_MESSAGES.GREET_USER,
    schema: z.object({
      message: z
        .string()
        .optional()
        .describe(
          'The user greeting text, e.g. "Hi", "Hello", "Hey there", "Good morning"',
        ),
    }),
  },
);

/** Conversational greeting tools available to all authenticated users. */
export const greetingTools = [greetUserTool] as const;
