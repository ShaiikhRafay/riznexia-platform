const VALID_NPM_NAME = /^[a-z0-9-]+$/;

/** kebab-case, npm-package-name-safe slug derived from a business name. */
export function slugifyPackageName(businessName: string): string {
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return VALID_NPM_NAME.test(slug) && slug.length > 0 ? slug : 'generated-website';
}

/**
 * Sets the static template's package.json `name` field via
 * JSON.parse -> structured mutation -> JSON.stringify — never string
 * replacement, so the rest of the file (deps/scripts/devDeps) is
 * guaranteed to stay byte-valid JSON regardless of formatting.
 */
export function withGeneratedPackageName(
  templatePackageJsonContent: string,
  businessName: string,
): string {
  const parsed = JSON.parse(templatePackageJsonContent) as Record<string, unknown>;
  parsed.name = slugifyPackageName(businessName);
  return `${JSON.stringify(parsed, null, 2)}\n`;
}
