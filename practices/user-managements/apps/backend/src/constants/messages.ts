/** API and domain error messages. */
export const API_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized.',
  FORBIDDEN: 'Forbidden.',
  USER_NOT_FOUND: 'User not found.',
  CANNOT_DEACTIVATE_SELF_ACCOUNT:
    'You cannot deactivate your own account while signed in.',
  INVALID_INPUT: 'Invalid input.',
} as const;

export const USER_DOMAIN_ERRORS = {
  EMAIL_ALREADY_IN_USE: 'Email already in use.',
  FAILED_TO_READ_CREATED_USER: 'Failed to read created user',
  COULD_NOT_LOAD_PROFILE: 'Could not load profile.',
} as const;

/** LangChain tool descriptions. */
export const TOOL_MESSAGES = {
  GET_MY_PROFILE:
    "Load the signed-in user's full profile record (name, DOB YYYY-MM-DD, bio). Email is shown for reference only.",
  UPDATE_MY_PROFILE:
    "Update ONLY the signed-in user's profile fields (name, bio, date of birth). Omit unchanged fields. Date of birth as YYYY-MM-DD. Email cannot be updated.",
  LIST_USERS:
    'List every user, newest first. Use to disambiguate duplicate display names before mutations.',
  GET_USER: 'Fetch one user by id (includes profile columns).',
  FIND_USER_BY_EMAIL:
    'Look up one directory user by email. Never claim an email exists without tool output.',
  CREATE_USER:
    'Create a directory user with unique email, full name, and date of birth (YYYY-MM-DD); bio optional. Default password Abcd@123. Requires human approval via interrupt.',
  UPDATE_USER:
    'Update name, bio, date of birth, or status for one user id. Never change email. Requires human approval via interrupt.',
  DELETE_USER: 'Delete one user by id. Requires human approval via interrupt.',
  GET_KNOWLEDGE:
    'Search the knowledge base for policies, field rules, and FAQs.',
  QUERY_USER_INFO: 'Semantic search over vectorized user-directory snapshots.',
  ADD_KNOWLEDGE:
    'Add text to the knowledge base (policies, runbooks, FAQ). Admin only.',
} as const;

export const CONFIRM_MESSAGES = {
  DUPLICATE_DISPLAY_NAME_BLOCKED:
    'Multiple users share this display name. List matches and ask which account before mutating.',
  DUPLICATE_DISPLAY_NAME_HINT:
    'Ask the user to specify email, UUID, or date of birth to disambiguate.',
} as const;
