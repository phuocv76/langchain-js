export type Env = {
  DB: D1Database;
  OPENAI_API_KEY?: string;
  /** Comma-separated allowed browser origins (e.g. Pages URL). */
  CORS_ORIGINS?: string;
  /** Public LangGraph deployment base URL for CopilotKit. */
  LANGGRAPH_DEPLOYMENT_URL?: string;
};
