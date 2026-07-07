// Internal
import { greetingTool } from './greeting.tool.js';

/**
 * All tools available to the default agent.
 *
 * To add a tool: create `src/tools/<name>.tool.ts`, then append it here.
 */
export const tools = [greetingTool];
