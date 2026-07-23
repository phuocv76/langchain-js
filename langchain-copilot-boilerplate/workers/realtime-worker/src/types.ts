export interface Env {
  readonly USER_HUB: DurableObjectNamespace;
  readonly FIREBASE_PROJECT_ID: string;
  readonly REALTIME_PUBLISH_SECRET: string;
  /** Comma-separated browser origins allowed for CORS / WS. */
  readonly CORS_ORIGINS?: string;
}

// Shared wire contract (type-only import — erased at build, so the worker
// keeps zero runtime workspace dependencies).
export type {
  RealtimeEvent,
  RealtimeEventType,
  RealtimePublishRequest,
} from '@repo/shared';
