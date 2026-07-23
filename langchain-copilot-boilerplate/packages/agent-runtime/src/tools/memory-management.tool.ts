// Libs for third party
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/** Tool name the durable-memory middleware intercepts in wrapToolCall. */
export const MEMORY_MANAGEMENT_TOOL_NAME = 'manage_memory';

/**
 * Lets a user list or delete only their own durable conversation memory.
 * Deletion removes the full scope (transcript, titles, engine checkpoints,
 * thread metadata) via the memory worker's atomic scope delete.
 */
export const memoryManagementTool = tool(
  async ({ action }): Promise<string> => `Memory action requested: ${action}`,
  {
    name: MEMORY_MANAGEMENT_TOOL_NAME,
    description:
      'List the current conversation memory, delete this conversation memory, or delete all of the user\'s durable conversation memory. Use only when the user explicitly asks to view or remove memory.',
    schema: z.object({
      action: z.enum(['list_thread', 'delete_thread', 'delete_all']),
    }),
  },
);
