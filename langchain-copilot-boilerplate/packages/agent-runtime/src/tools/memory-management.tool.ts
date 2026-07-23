// Libs for third party
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

/** Lets a user list or delete only their own durable transcript memory. */
export const memoryManagementTool = tool(
  async ({ action }): Promise<string> => `Memory action requested: ${action}`,
  {
    name: 'manage_memory',
    description:
      'List the current conversation memory, delete this conversation memory, or delete all of the user\'s durable conversation memory. Use only when the user explicitly asks to view or remove memory.',
    schema: z.object({
      action: z.enum(['list_thread', 'delete_thread', 'delete_all']),
    }),
  },
);
