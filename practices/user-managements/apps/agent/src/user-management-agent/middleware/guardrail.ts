// Libs for third party
import { createMiddleware } from 'langchain';

// Internal
import { buildMemberSystemPrompt } from '../../constants/prompts.js';
import { createScopeGuardrailMiddleware } from '../../lib/scope-guardrail.js';
import { GUARDRAIL_KEYWORDS, GUARDRAILS } from '../../constants/messages.js';

/** Rejects off-topic questions in-chat. */
export const userManagementScopeGuardrailMiddleware =
  createScopeGuardrailMiddleware({
    name: 'UserManagementScopeGuardrail',
    keywords: GUARDRAIL_KEYWORDS.USER_MANAGEMENT,
    outOfScopeMessage: GUARDRAILS.USER_MANAGEMENT,
  });

/** Appends role-specific instructions to the system message. */
export const rolePromptMiddleware = createMiddleware({
  name: 'RolePromptMiddleware',
  wrapModelCall: async (request, handler) => {
    const configurable =
      (request as { runtime?: { configurable?: Record<string, unknown> } })
        .runtime?.configurable ?? {};

    if (configurable.userRole !== 'member') {
      return handler(request);
    }

    const userName =
      typeof configurable.userName === 'string'
        ? configurable.userName
        : 'Member';

    return handler({
      ...request,
      systemMessage: request.systemMessage.concat(
        `\n\n${buildMemberSystemPrompt(userName)}`,
      ),
    });
  },
});
