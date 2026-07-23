import { env } from '../../config/env.js';
import type { RealtimePublishRequest, RealtimePublisher } from './types.js';

/**
 * Realtime fan-out is best-effort AND awaited on the chat hot path
 * (durable-memory publishes before the model runs), so a slow worker must
 * never hold a turn hostage — fail fast and let the caller swallow it.
 */
const PUBLISH_TIMEOUT_MS = 3_000;

/**
 * Posts mutation events to the Cloudflare realtime worker after durable
 * persistence succeeds. Failures are logged and swallowed by callers.
 */
export class CloudflareRealtimePublisher implements RealtimePublisher {
  async publish(request: RealtimePublishRequest): Promise<void> {
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
      signal: AbortSignal.timeout(PUBLISH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Realtime publish returned ${response.status}`);
    }
  }
}
