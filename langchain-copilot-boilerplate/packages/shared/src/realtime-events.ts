/**
 * Cross-session realtime event contract shared by the agent runtime's
 * publisher and the realtime worker. The frontend keeps its own copy
 * (langchain-copilot-web repo, `src/services/websocket/client.ts`) — update
 * it when this changes.
 */

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

/** Body of `POST /publish` on the realtime worker. */
export type RealtimePublishRequest = {
  readonly userId: string;
  readonly event: RealtimeEvent;
};
