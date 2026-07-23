import { env } from '@agent/config/env.js';
import type { PublishRequest, RealtimePublisher } from '@agent/services/realtime/types.js';

/**
 * Posts mutation events to the Cloudflare realtime worker after durable
 * persistence succeeds. Failures are logged and swallowed by callers.
 */
export class CloudflareRealtimePublisher implements RealtimePublisher {
  async publish(request: PublishRequest): Promise<void> {
    const baseUrl = env.REALTIME_WORKER_URL;
    const secret = env.REALTIME_PUBLISH_SECRET;
    if (!baseUrl || !secret) {
      throw new Error('Realtime publisher is not configured');
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Realtime publish returned ${response.status}`);
    }
  }
}
