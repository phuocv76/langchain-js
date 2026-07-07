// Libs for third party
import tseslint from 'typescript-eslint';

// Internal
import { baseConfig } from './base.js';

/**
 * ESLint config for the Next.js app. Extends the shared base with browser globals.
 * @type {import('eslint').Linter.Config[]}
 */
export const nextConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        React: 'readonly',
        JSX: 'readonly',
      },
    },
  },
];

export default nextConfig;
