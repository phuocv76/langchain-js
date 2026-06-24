import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

// Load monorepo-root `.env` so CopilotKit / LangGraph vars are available to API routes.
loadEnv({ path: resolve(fileURLToPath(new URL('.', import.meta.url)), '../.env') });

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
