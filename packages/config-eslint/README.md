# @riznexia/config-eslint

Shared ESLint flat configs (ESLint 9) for the monorepo, implementing [Coding Standards](../../docs/12-coding-standards.md).

## Usage

In an app's `eslint.config.js`:

```js
import nextjs from '@riznexia/config-eslint/nextjs';
export default nextjs;
```

or for a NestJS app:

```js
import nestjs from '@riznexia/config-eslint/nestjs';
export default nestjs;
```

## What's enforced

- TypeScript strict linting (`@typescript-eslint/recommended`)
- No `any` (error, not warning)
- No default exports, except Next.js App Router's framework-reserved files (`page.tsx`, `layout.tsx`, etc.), which require them
- Prettier compatibility (stylistic rules deferred to Prettier, not duplicated here)
