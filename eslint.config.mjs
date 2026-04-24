import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import vitest from 'eslint-plugin-vitest';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  // Ignore build and vendor folders
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript recommended rules (non type-aware for speed)
  ...tseslint.configs.recommended,

  // Project rules
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      vitest,
      prettier: prettierPlugin
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // React 17+ new JSX transform
      'react/react-in-jsx-scope': 'off',
      // Helpful but non-blocking formatting reports
      'prettier/prettier': 'warn',
      // Library-friendly defaults
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ],
      '@typescript-eslint/no-empty-object-type': 'off',
      // Occasionally useful in regex literals here; reduce to warning to avoid CI failures
      'no-useless-escape': 'warn',
      // A few JS core rules that are opinionated for libs
      'prefer-const': ['warn', { destructuring: 'all' }]
    }
  },

  // Test files: enable Vitest globals
  {
    files: ['src/__tests__/**/*.{ts,tsx}', '**/*.{test,spec}.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.vitest,
        ...globals.node
      }
    },
    plugins: { vitest },
    rules: {
      // tests often use any, flexible types and unused args
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'off',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ]
    }
  },

  // Keep Prettier last to disable conflicting stylistic rules
  prettier
];
