// Internal
import { adminMutationTools, memberMutationTools } from './mutation-tools.js';
import { ragTools } from './rag-tools.js';
import { adminReadTools, memberReadTools } from './read-tools.js';

/** All tools available to admin users. */
export const adminTools = [
  ...adminReadTools,
  ...memberMutationTools,
  ...adminMutationTools,
  ...ragTools,
];

/** Tools available to member users. */
export const memberTools = [
  ...memberReadTools,
  ...memberMutationTools,
  ragTools[0],
];
