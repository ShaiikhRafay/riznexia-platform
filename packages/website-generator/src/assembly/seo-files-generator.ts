import ts from 'typescript';
import type { ThemeTokens } from '@riznexia/shared-types';
import { importDeclaration, printStatements, valueToExpression } from './ts-ast-helpers';

const DEFAULT_SITE_URL = 'http://localhost:3000';

// `process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'` — same
// deploy-time-env-var convention as lib/image-utils.ts and app/layout.tsx's
// metadataBase; robots.ts/sitemap.ts need the real production origin,
// which this assembler never has (it only ever sees the 5 upstream
// manifests, not a deployment target).
function siteUrlExpression(): ts.Expression {
  return ts.factory.createBinaryExpression(
    ts.factory.createPropertyAccessExpression(
      ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier('process'), 'env'),
      'NEXT_PUBLIC_SITE_URL',
    ),
    ts.factory.createToken(ts.SyntaxKind.QuestionQuestionToken),
    ts.factory.createStringLiteral(DEFAULT_SITE_URL),
  );
}

function defaultExportFunction(
  name: string,
  returnTypeName: string,
  returnExpression: ts.Expression,
): ts.Statement {
  return ts.factory.createFunctionDeclaration(
    [
      ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
      ts.factory.createModifier(ts.SyntaxKind.DefaultKeyword),
    ],
    undefined,
    ts.factory.createIdentifier(name),
    undefined,
    [],
    ts.factory.createTypeReferenceNode(returnTypeName),
    ts.factory.createBlock([ts.factory.createReturnStatement(returnExpression)], true),
  );
}

/** `app/robots.ts` — allow-all rules, sitemap pointed at the deploy-time site URL. */
export function generateRobotsSource(): string {
  const sitemapUrl = ts.factory.createTemplateExpression(ts.factory.createTemplateHead(''), [
    ts.factory.createTemplateSpan(
      siteUrlExpression(),
      ts.factory.createTemplateTail('/sitemap.xml'),
    ),
  ]);

  const returnExpression = ts.factory.createObjectLiteralExpression(
    [
      ts.factory.createPropertyAssignment(
        'rules',
        ts.factory.createObjectLiteralExpression(
          [
            ts.factory.createPropertyAssignment('userAgent', ts.factory.createStringLiteral('*')),
            ts.factory.createPropertyAssignment('allow', ts.factory.createStringLiteral('/')),
          ],
          true,
        ),
      ),
      ts.factory.createPropertyAssignment('sitemap', sitemapUrl),
    ],
    true,
  );

  return printStatements([
    importDeclaration(['MetadataRoute'], 'next', true),
    defaultExportFunction('robots', 'MetadataRoute.Robots', returnExpression),
  ]);
}

/** `app/sitemap.ts` — single-entry sitemap (this pipeline only ever assembles one page). */
export function generateSitemapSource(): string {
  const entry = ts.factory.createObjectLiteralExpression(
    [
      ts.factory.createPropertyAssignment('url', siteUrlExpression()),
      ts.factory.createPropertyAssignment(
        'lastModified',
        ts.factory.createNewExpression(ts.factory.createIdentifier('Date'), undefined, []),
      ),
    ],
    true,
  );
  const returnExpression = ts.factory.createArrayLiteralExpression([entry], true);

  return printStatements([
    importDeclaration(['MetadataRoute'], 'next', true),
    defaultExportFunction('sitemap', 'MetadataRoute.Sitemap', returnExpression),
  ]);
}

/** `app/manifest.ts` — PWA manifest; fully literal, no deploy-time values needed. */
export function generateManifestSource(businessName: string, themeTokens: ThemeTokens): string {
  const returnExpression = valueToExpression({
    name: businessName,
    short_name: businessName,
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
    start_url: '/',
    display: 'standalone',
    theme_color: themeTokens.primary,
    background_color: themeTokens.background,
  });

  return printStatements([
    importDeclaration(['MetadataRoute'], 'next', true),
    defaultExportFunction('manifest', 'MetadataRoute.Manifest', returnExpression),
  ]);
}
