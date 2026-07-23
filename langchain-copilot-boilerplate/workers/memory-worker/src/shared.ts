/** Bindings shared by every route module in this Worker. */
export interface Env {
  readonly MEMORY_DB: D1Database;
  /** Absent in the local-only `<product>-offline` envs; semantic recall then degrades. */
  readonly MEMORY_INDEX?: VectorizeIndex;
  /** Absent in the local-only `<product>-offline` envs; semantic recall then degrades. */
  readonly AI?: Ai;
  /** Set to 'false' only for local `wrangler dev`; deployed Workers keep Access required. */
  readonly REQUIRE_CF_ACCESS?: string;
}

export const json = (value: unknown, status = 200): Response =>
  Response.json(value, { status });

export const isString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;
