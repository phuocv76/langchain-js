import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsup';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'es2022',
  sourcemap: true,
  clean: true,
  noExternal: [/^@repo\//],
  esbuildOptions(options) {
    options.alias = {
      ...options.alias,
      '@agent': path.resolve(root, 'src'),
    };
  },
});
