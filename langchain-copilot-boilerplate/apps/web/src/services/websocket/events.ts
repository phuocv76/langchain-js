export type RealtimeEventType =
  | 'MESSAGE_CREATED'
  | 'THREAD_CREATED'
  | 'THREAD_UPDATED'
  | 'THREAD_RENAMED'
  | 'THREAD_DELETED'
  | 'CONNECTED';

export type RealtimeEvent = {
  readonly type: RealtimeEventType;
  readonly threadId?: string;
  readonly updatedAt: string;
  readonly messageId?: string;
  readonly role?: string;
  readonly title?: string | null;
};

export const parseRealtimeEvent = (raw: string): RealtimeEvent | undefined => {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return undefined;
    const candidate = value as Record<string, unknown>;
    if (typeof candidate.type !== 'string' || typeof candidate.updatedAt !== 'string') {
      return undefined;
    }
    return candidate as RealtimeEvent;
  } catch {
    return undefined;
  }
};
