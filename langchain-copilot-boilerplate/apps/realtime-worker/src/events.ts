import { z } from 'zod';

import type { RealtimeEvent, RealtimeEventType } from './types';

const eventTypeSchema = z.enum([
  'MESSAGE_CREATED',
  'THREAD_CREATED',
  'THREAD_UPDATED',
  'THREAD_RENAMED',
  'THREAD_DELETED',
] satisfies [RealtimeEventType, ...RealtimeEventType[]]);

export const realtimeEventSchema = z.object({
  type: eventTypeSchema,
  threadId: z.string().min(1),
  updatedAt: z.string().min(1),
  messageId: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  title: z.string().nullable().optional(),
});

export const publishBodySchema = z.object({
  userId: z.string().min(1),
  event: realtimeEventSchema,
});

export const parseRealtimeEvent = (value: unknown): RealtimeEvent | undefined => {
  const parsed = realtimeEventSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
};
