import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source; transpile them in the app build.
  transpilePackages: ['@repo/ui', '@repo/shared', '@repo/types'],
  // Pin file tracing to the monorepo root (multiple lockfiles may exist).
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
};

export default nextConfig;
