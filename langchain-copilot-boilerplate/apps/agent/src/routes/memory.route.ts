// Libs for third party
import { Hono } from 'hono';

// Internal
import {
  listThreadMessages,
  listThreads,
} from '@agent/controllers/memory.controller.js';

/** Read-only D1 transcript endpoints consumed by the custom web history UI. */
export const memoryRoute = new Hono()
  .get('/threads', listThreads)
  .get('/threads/:threadId/messages', listThreadMessages);
