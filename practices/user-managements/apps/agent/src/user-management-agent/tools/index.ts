// Internal
import { greetingTools } from './greeting-tools.js';
import { adminMutationTools, memberMutationTools } from './mutation-tools.js';
import { ragTools } from './rag-tools.js';
import { adminReadTools, memberReadTools } from './read-tools.js';

/** All tools available to admin users. */
export const adminTools = [
  ...greetingTools,
  ...adminReadTools,
  ...memberMutationTools,
  ...adminMutationTools,
  ...ragTools,
];

/** Tools available to member users. */
export const memberTools = [
  ...greetingTools,
  ...memberReadTools,
  ...memberMutationTools,
  ragTools[0],
];
