// Libs for third party
import { z } from 'zod';

/** Validation schema for the `POST /chat` request body. */
export const chatRequestSchema = z.object({
  message: z.string().min(1, 'message is required'),
  threadId: z.string().optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});
