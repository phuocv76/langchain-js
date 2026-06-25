/**
 * Loads environment variables from `.env` when running exercises locally.
 * The LangGraph dev server loads `.env` via `langgraph.json`; this helper
 * keeps standalone scripts consistent.
 */
import "dotenv/config";
