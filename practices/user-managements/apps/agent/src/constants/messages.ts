/** Error strings for agent bootstrap. */
export const ERRORS = {
  OPENAI_API_KEY: 'OPENAI_API_KEY is required',
} as const;

/** Off-topic guardrail message. */
export const GUARDRAILS = {
  USER_MANAGEMENT:
    'I can only help with user management tasks like profiles, users, roles, and account updates.',
} as const;

/** Keywords that indicate user-management scope (allowlist). */
export const GUARDRAIL_KEYWORDS = {
  USER_MANAGEMENT:
    /\b(user|users|profile|account|admin|member|role|directory|email|name|bio|birth|dob|create|update|delete|list|activate|deactivate|status|policy|knowledge|faq|editable|field|fields|help|invite|invitation|invited|onboard|register|signup|sign-up|remove)\b/i,
} as const;

/** LangChain tool descriptions. */
export const TOOL_MESSAGES = {
  GET_MY_PROFILE:
    "Load the signed-in user's full profile record (name, DOB YYYY-MM-DD, bio). Email is shown for reference only.",
  UPDATE_MY_PROFILE:
    "Update ONLY the signed-in user's profile fields (name, bio, date of birth). Omit unchanged fields. Requires human approval.",
  LIST_USERS:
    'List every user, newest first. Use to disambiguate duplicate display names before mutations.',
  FIND_USER_BY_EMAIL:
    'Look up one directory user by email. Never claim an email exists without tool output.',
  GET_USER: 'Fetch one user by id (includes profile columns).',
  CREATE_USER:
    'Create a directory user with unique email, full name, and DOB (YYYY-MM-DD). Default password Abcd@123. Requires human approval.',
  UPDATE_USER:
    'Update name, bio, date of birth, or status for one user id. Never change email. Requires human approval.',
  DELETE_USER: 'Delete one user by id. Requires human approval.',
  GET_KNOWLEDGE:
    'Search the knowledge base for policies, field rules, and FAQs.',
  QUERY_USER_INFO:
    'Semantic search over vectorized user-directory snapshots. Admin only.',
  ADD_KNOWLEDGE:
    'Add text to the knowledge base (policies, runbooks, FAQ). Admin only.',
} as const;

export const CONFIRM_MESSAGES = {
  DUPLICATE_DISPLAY_NAME_BLOCKED:
    'Multiple users share this display name. List matches and ask which account before mutating.',
  DUPLICATE_DISPLAY_NAME_HINT:
    'Ask the user to specify email, UUID, or date of birth to disambiguate.',
} as const;
