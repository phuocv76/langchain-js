/**
 * Shared, framework-agnostic types used across apps.
 * Keep this package free of runtime dependencies so it can be imported anywhere.
 */

/** Health check payload. */
export interface HealthStatus {
  readonly status: 'ok';
  readonly service: string;
  readonly uptimeSeconds: number;
}
