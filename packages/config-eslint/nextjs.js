// Next.js-specific overlay on the base config — Doc 12 §3.
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import base from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    // Next.js App Router requires default exports for these framework-reserved files —
    // this is a documented exception to Doc 12 §1's named-exports rule, not a violation of it.
    files: [
      '**/app/**/page.tsx',
      '**/app/**/layout.tsx',
      '**/app/**/loading.tsx',
      '**/app/**/error.tsx',
      '**/app/**/not-found.tsx',
      '**/app/**/route.ts',
      'next.config.*',
      'tailwind.config.*',
      'postcss.config.*',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
];
