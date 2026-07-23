export type RealtimeEventType =
  | 'MESSAGE_CREATED'
  | 'THREAD_CREATED'
  | 'THREAD_UPDATED'
  | 'THREAD_RENAMED'
  | 'THREAD_DELETED';

export type RealtimeEvent = {
  readonly type: RealtimeEventType;
  readonly threadId: string;
  readonly updatedAt: string;
  readonly messageId?: string;
  readonly role?: string;
  readonly title?: string | null;
};

export type PublishRequest = {
  readonly userId: string;
  readonly event: RealtimeEvent;
};

export interface RealtimePublisher {
  publish(request: PublishRequest): Promise<void>;
}
