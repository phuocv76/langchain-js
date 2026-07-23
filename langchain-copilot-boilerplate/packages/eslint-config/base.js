// Libs for third party
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

/**
 * Shared flat ESLint config for all TypeScript packages.
 * @type {import('eslint').Linter.Config[]}
 */
export const baseConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '.turbo/**'],
  },
];
