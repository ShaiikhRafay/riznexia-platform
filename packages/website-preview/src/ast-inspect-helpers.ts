import ts from 'typescript';
import type { GeneratedWebsiteFile } from '@riznexia/shared-types';

// Module M9 — the read-only mirror of website-generator's assembly/
// ts-ast-helpers.ts: that package builds a real TypeScript AST and prints
// it; this one parses GeneratedWebsite.files' already-printed source back
// into a real AST via `ts.createSourceFile()` and inspects it. Every
// validator that needs to look inside a specific file (app/page.tsx's
// `metadata` export, its JSON-LD `<script>` tags, its JSX tree) goes
// through these primitives rather than re-implementing parsing per
// validator. This never writes anything — GeneratedWebsite.files is only
// ever read (D-075 read-only requirement).

export function findFile(
  files: GeneratedWebsiteFile[],
  path: string,
): GeneratedWebsiteFile | undefined {
  return files.find((file) => file.path === path);
}

export function parseSourceFile(content: string, fileName: string): ts.SourceFile {
  return ts.createSourceFile(fileName, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

/** Converts a literal AST expression (string/number/boolean/null/array/object) back into a plain JS value — the reverse of website-generator's `valueToExpression`. Returns `undefined` for any node shape it doesn't recognize (e.g. a dynamic expression) rather than guessing. */
export function nodeToPlainValue(node: ts.Expression): unknown {
  if (ts.isStringLiteralLike(node)) {
    return node.text;
  }
  if (ts.isNumericLiteral(node)) {
    return Number(node.text);
  }
  if (node.kind === ts.SyntaxKind.TrueKeyword) {
    return true;
  }
  if (node.kind === ts.SyntaxKind.FalseKeyword) {
    return false;
  }
  if (node.kind === ts.SyntaxKind.NullKeyword) {
    return null;
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.map((element) => nodeToPlainValue(element));
  }
  if (ts.isObjectLiteralExpression(node)) {
    const result: Record<string, unknown> = {};
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const key = ts.isIdentifier(property.name)
        ? property.name.text
        : ts.isStringLiteral(property.name)
          ? property.name.text
          : null;
      if (key !== null) {
        result[key] = nodeToPlainValue(property.initializer);
      }
    }
    return result;
  }
  return undefined;
}

/** Finds `export const <name> = <expression>;` (or `export const <name>: T = <expression>;`) among a source file's top-level statements and returns its parsed plain value. */
export function findExportedConstValue(sourceFile: ts.SourceFile, exportName: string): unknown {
  return findAllExportedConstValues(sourceFile).get(exportName);
}

/** Every top-level `export const <name> = <expression>;` in a source file, by name — used where the exact set of exported names isn't known ahead of time (e.g. lib/site-data.ts's per-component `<id>Props` consts, whose names depend on the business's own ComponentManifest). */
export function findAllExportedConstValues(sourceFile: ts.SourceFile): Map<string, unknown> {
  const values = new Map<string, unknown>();
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const isExported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (!isExported) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer) {
        values.set(declaration.name.text, nodeToPlainValue(declaration.initializer));
      }
    }
  }
  return values;
}

/** Recursively searches a parsed plain value tree for every nested object matching a predicate — e.g. every `{photoReference: string}` shape inside lib/site-data.ts's exported props, regardless of which component or field it's nested under. */
export function findNestedObjects(
  value: unknown,
  predicate: (candidate: Record<string, unknown>) => boolean,
): Record<string, unknown>[] {
  const matches: Record<string, unknown>[] = [];

  function visit(node: unknown) {
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      if (predicate(record)) matches.push(record);
      for (const key of Object.keys(record)) visit(record[key]);
    }
  }

  visit(value);
  return matches;
}

/** Every `@/components/sections/<name>` import path a source file imports from (e.g. app/page.tsx's imports of the specific templates it renders for this business) — resolved to the corresponding GeneratedWebsiteFile path (`components/sections/<name>.tsx`). */
export function importedSectionComponentPaths(sourceFile: ts.SourceFile): string[] {
  const paths: string[] = [];
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    const specifier = statement.moduleSpecifier.text;
    if (specifier.startsWith('@/components/sections/')) {
      paths.push(`${specifier.slice(2)}.tsx`);
    }
  }
  return paths;
}

/** Every string value found anywhere inside a parsed plain value tree (e.g. lib/site-data.ts's exported props) — used for coarse non-emptiness/keyword-presence checks that don't need to know the exact field path. */
export function collectStrings(value: unknown): string[] {
  const strings: string[] = [];

  function visit(node: unknown) {
    if (typeof node === 'string') {
      strings.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node && typeof node === 'object') {
      for (const key of Object.keys(node as Record<string, unknown>))
        visit((node as Record<string, unknown>)[key]);
    }
  }

  visit(value);
  return strings;
}

/** Walks every node in a source file, collecting every JSX element/self-closing element whose tag name matches. */
export function findJsxElementsByTag(
  sourceFile: ts.SourceFile,
  tagName: string,
): (ts.JsxElement | ts.JsxSelfClosingElement)[] {
  const matches: (ts.JsxElement | ts.JsxSelfClosingElement)[] = [];

  function visit(node: ts.Node) {
    if (ts.isJsxSelfClosingElement(node) && tagNameOf(node.tagName) === tagName) {
      matches.push(node);
    }
    if (ts.isJsxElement(node) && tagNameOf(node.openingElement.tagName) === tagName) {
      matches.push(node);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return matches;
}

function tagNameOf(tagName: ts.JsxTagNameExpression): string {
  return ts.isIdentifier(tagName) ? tagName.text : tagName.getText();
}

/** Reads a JSX attribute's value as a plain string — handles both `attr="literal"` and `attr={"literal"}`/`attr={expr}` (returning `undefined` for a non-literal expression). */
export function jsxAttributeStringValue(
  element: ts.JsxOpeningLikeElement,
  attributeName: string,
): string | undefined {
  for (const attribute of element.attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || attribute.name.getText() !== attributeName) continue;
    if (!attribute.initializer) return undefined;
    if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
    if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
      const value = nodeToPlainValue(attribute.initializer.expression);
      return typeof value === 'string' ? value : undefined;
    }
  }
  return undefined;
}

/** Reads a JSX attribute's raw expression value (for non-string values, e.g. `dangerouslySetInnerHTML={{__html: "..."}}`). */
export function jsxAttributePlainValue(
  element: ts.JsxOpeningLikeElement,
  attributeName: string,
): unknown {
  for (const attribute of element.attributes.properties) {
    if (!ts.isJsxAttribute(attribute) || attribute.name.getText() !== attributeName) continue;
    if (!attribute.initializer) return undefined;
    if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
    if (ts.isJsxExpression(attribute.initializer) && attribute.initializer.expression) {
      return nodeToPlainValue(attribute.initializer.expression);
    }
  }
  return undefined;
}

export function openingElementOf(
  node: ts.JsxElement | ts.JsxSelfClosingElement,
): ts.JsxOpeningLikeElement {
  return ts.isJsxSelfClosingElement(node) ? node : node.openingElement;
}

/** Extracts every JSON-LD payload from `<script type="application/ld+json" dangerouslySetInnerHTML={{__html: "..."}}>` tags in a source file. Malformed JSON is skipped, never thrown — a structural-integrity concern for the validator to flag, not a parser crash. */
export function extractJsonLdPayloads(sourceFile: ts.SourceFile): Record<string, unknown>[] {
  const scripts = findJsxElementsByTag(sourceFile, 'script');
  const payloads: Record<string, unknown>[] = [];

  for (const script of scripts) {
    const opening = openingElementOf(script);
    if (jsxAttributeStringValue(opening, 'type') !== 'application/ld+json') continue;

    const innerHtmlProp = jsxAttributePlainValue(opening, 'dangerouslySetInnerHTML');
    const html = (innerHtmlProp as { __html?: unknown } | undefined)?.__html;
    if (typeof html !== 'string') continue;

    try {
      const parsed = JSON.parse(html) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        payloads.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Malformed JSON-LD is a real finding for SEOValidator to report, not a parse failure to crash on.
    }
  }

  return payloads;
}
