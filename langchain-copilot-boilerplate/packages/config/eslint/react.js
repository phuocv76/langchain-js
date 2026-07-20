// Libs for third party
import reactHooks from 'eslint-plugin-react-hooks';

// Internal
import { baseConfig } from './base.js';

/**
 * ESLint config for React (Vite) apps. Extends the shared base with browser
 * globals and react-hooks rules.
 * @type {import('eslint').Linter.Config[]}
 */
export const reactConfig = [
  ...baseConfig,
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: {
        React: 'readonly',
        JSX: 'readonly',
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
];

export default reactConfig;
