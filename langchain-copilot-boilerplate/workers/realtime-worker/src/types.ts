export interface Env {
  readonly USER_HUB: DurableObjectNamespace;
  readonly FIREBASE_PROJECT_ID: string;
  readonly REALTIME_PUBLISH_SECRET: string;
  /** Comma-separated browser origins allowed for CORS / WS. */
  readonly CORS_ORIGINS?: string;
}

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

export type PublishBody = {
  readonly userId: string;
  readonly event: RealtimeEvent;
};
