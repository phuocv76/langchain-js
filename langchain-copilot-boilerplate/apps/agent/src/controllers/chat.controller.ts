// Libs for third party
import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';

// Internal
import { chatRequestSchema } from '@agent/schemas/chat.schema.js';
import { streamChatTokens } from '@agent/services/chat.service.js';
import { logger } from '@agent/utils/logger.js';

/**
 * Handles `POST /chat`.
 *
 * Validates the body and streams assistant tokens back as Server-Sent Events.
 * Each `message` event carries `{ token }`; a final `done` event closes it.
 */
export const handleChat = async (c: Context): Promise<Response> => {
  const body = await c.req.json().catch(() => null);
  const parsed = chatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid body' },
      400,
    );
  }

  const { message, threadId } = parsed.data;

  return streamSSE(c, async (stream) => {
    try {
      for await (const token of streamChatTokens({ message, threadId })) {
        await stream.writeSSE({
          event: 'message',
          data: JSON.stringify({ token }),
        });
      }
      await stream.writeSSE({ event: 'done', data: '[DONE]' });
    } catch (error) {
      logger.error('chat stream failed', error);
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({
          error: error instanceof Error ? error.message : 'stream failed',
        }),
      });
    }
  });
};
