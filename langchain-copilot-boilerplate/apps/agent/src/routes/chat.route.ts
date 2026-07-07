// Libs for third party
import { Hono } from 'hono';

// Internal
import { handleChat } from '../controllers/chat.controller.js';

/** `POST /chat` — streaming chat over Server-Sent Events. */
export const chatRoute = new Hono().post('/', handleChat);
