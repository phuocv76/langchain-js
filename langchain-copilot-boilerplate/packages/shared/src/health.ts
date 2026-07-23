/** Health check payload. */
export interface HealthStatus {
  readonly status: 'ok';
  readonly service: string;
  readonly uptimeSeconds: number;
}
