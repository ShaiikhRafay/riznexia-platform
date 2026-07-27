// Shared base ESLint flat config — Doc 12 §1 (TS strict, no default exports, no `any`).
// ESLint 9's flat config has no implicit `env` — global variables (Node's
// `process`/`Buffer`, Jest's `describe`/`it`/`expect`/`jest`) must be listed
// explicitly, unlike the old .eslintrc `env: { node: true, jest: true }`.
import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  {
    // Plain .js/.mjs/.cjs config files (jest.config.js, turbo/build tooling)
    // get Node globals too — not just .ts/.tsx source.
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Core no-undef doesn't understand TS type-only references (e.g.
      // `React.ReactNode` when React is never value-imported under the
      // modern JSX transform) and produces false positives; the TS
      // compiler itself already catches genuinely undefined identifiers,
      // which is why typescript-eslint's own docs recommend disabling it
      // for .ts/.tsx specifically (not for plain .js config files, where
      // it still applies via the block above).
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Named exports only — see Doc 12 §1 (Coding Standards).',
        },
      ],
    },
  },
  {
    files: ['**/*.spec.{ts,js}', '**/*.test.{ts,js}', '**/*.e2e-spec.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    ignores: ['dist/**', '.next/**', 'node_modules/**', 'coverage/**'],
  },
  prettierConfig,
];
