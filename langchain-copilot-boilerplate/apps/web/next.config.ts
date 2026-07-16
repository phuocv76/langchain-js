import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source; transpile them in the app build.
  transpilePackages: ['@repo/shared'],
  // Pin file tracing to the monorepo root (multiple lockfiles may exist).
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
};

export default nextConfig;
