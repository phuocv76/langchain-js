// Libs for third party
import { Hono } from 'hono';

// Internal
import {
  deleteThread,
  listThreadHistoryMessages,
  listThreads,
  renameThread,
} from '../controllers/memory.controller.js';

/** D1 transcript endpoints consumed by the custom web history UI. */
export const memoryRoute = new Hono()
  .get('/threads', listThreads)
  .get('/threads/:threadId/history-messages', listThreadHistoryMessages)
  .patch('/threads/:threadId', renameThread)
  .delete('/threads/:threadId', deleteThread);
