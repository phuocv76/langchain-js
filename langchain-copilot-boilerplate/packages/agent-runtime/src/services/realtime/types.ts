// Internal
import type { RealtimePublishRequest } from '@repo/shared';

export type {
  RealtimeEvent,
  RealtimeEventType,
  RealtimePublishRequest,
} from '@repo/shared';

export interface RealtimePublisher {
  publish(request: RealtimePublishRequest): Promise<void>;
}
