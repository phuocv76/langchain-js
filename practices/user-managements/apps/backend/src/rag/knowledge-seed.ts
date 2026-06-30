import { TOOL_MESSAGES } from '../constants/messages.js';

/** Static knowledge ingested on first RAG use. */
export const buildKnowledgeSeedDocument = (): string =>
  [
    '# User management knowledge base',
    'The assistant helps with profiles, users, roles, and account updates in English only.',
    `get_my_profile: ${TOOL_MESSAGES.GET_MY_PROFILE}`,
    `update_my_profile: ${TOOL_MESSAGES.UPDATE_MY_PROFILE}`,
    `list_users: ${TOOL_MESSAGES.LIST_USERS}`,
    `create_user: ${TOOL_MESSAGES.CREATE_USER}`,
    `update_user: ${TOOL_MESSAGES.UPDATE_USER}`,
    `delete_user: ${TOOL_MESSAGES.DELETE_USER}`,
    'Mutations require human approval via LangGraph interrupt before executing.',
    'Members may only use get_my_profile and update_my_profile on their own account.',
    'Email cannot be changed after account creation.',
    'Default password for assistant-created users is Abcd@123.',
    'User status: active or inactive. Inactive users cannot sign in.',
  ].join('\n\n');
