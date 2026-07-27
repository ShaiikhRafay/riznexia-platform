// NestJS-specific overlay on the base config — Doc 12 §2 (feature-module structure,
// tenant/role scoping enforced in guards, business logic never in controllers).
import base from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,
  {
    files: ['**/*.ts'],
    rules: {
      // Nest decorators (@Injectable, @Controller, etc.) commonly sit on classes that are
      // otherwise empty-looking to the base no-unused-vars heuristic — relaxed here only.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
