# @riznexia/config-typescript

Shared `tsconfig.json` bases. `base.json` holds the strict, framework-agnostic defaults (Doc 12 §1); `nextjs.json` and `nestjs.json` layer framework-specific compiler options on top.

## Usage

```json
{
  "extends": "@riznexia/config-typescript/nextjs.json",
  "compilerOptions": { "baseUrl": "." },
  "include": ["**/*.ts", "**/*.tsx"]
}
```
