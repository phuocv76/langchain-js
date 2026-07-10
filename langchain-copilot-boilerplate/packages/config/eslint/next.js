// Libs for third party
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import reactHooks from 'eslint-plugin-react-hooks';

// Internal
import { baseConfig } from './base.js';

/**
 * ESLint config for the Next.js app. Extends the shared base with browser globals.
 * @type {import('eslint').Linter.Config[]}
 */
export const nextConfig = [
  ...baseConfig,
  {
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: {
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...reactHooks.configs.recommended.rules,
    },
  },
];

export default nextConfig;
