import ts from 'typescript';

// Module M8.4 (DECISIONS.md D-068+) — "never concatenate JSX strings...
// use structured template rendering" (founder's explicit architecture
// requirement). Every generated .ts/.tsx file in this assembler is built
// as a real TypeScript AST via the TypeScript Compiler API (`ts.factory`)
// and printed by `ts.createPrinter()` — which guarantees syntactically
// valid output by construction. No string concatenation, no template
// literals building source code, anywhere in the assembly engine. These
// are the small, reusable primitives every generator (site-data,
// page, robots/sitemap/manifest) builds on.

const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const printSourceFile = ts.createSourceFile(
  'generated.tsx',
  '',
  ts.ScriptTarget.Latest,
  false,
  ts.ScriptKind.TSX,
);

/** Prints a list of top-level statements as a complete, formatted source file. */
export function printStatements(statements: ts.Statement[]): string {
  const file = ts.factory.updateSourceFile(printSourceFile, statements);
  return printer.printFile(file);
}

export function importDeclaration(
  names: string[],
  moduleSpecifier: string,
  isTypeOnly = false,
): ts.ImportDeclaration {
  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      isTypeOnly,
      undefined,
      ts.factory.createNamedImports(
        names.map((name) =>
          ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(name)),
        ),
      ),
    ),
    ts.factory.createStringLiteral(moduleSpecifier),
  );
}

/**
 * Converts a plain JSON-safe JS value (string/number/boolean/null/array/
 * object) into the equivalent ts.factory expression node — the single,
 * controlled serialization point every generator's data literal goes
 * through. Recursive, deterministic, no string building.
 */
export function valueToExpression(value: unknown): ts.Expression {
  if (value === null) {
    return ts.factory.createNull();
  }
  if (value === undefined) {
    return ts.factory.createIdentifier('undefined');
  }
  if (typeof value === 'string') {
    return ts.factory.createStringLiteral(value);
  }
  if (typeof value === 'number') {
    return value < 0
      ? ts.factory.createPrefixUnaryExpression(
          ts.SyntaxKind.MinusToken,
          ts.factory.createNumericLiteral(Math.abs(value)),
        )
      : ts.factory.createNumericLiteral(value);
  }
  if (typeof value === 'boolean') {
    return value ? ts.factory.createTrue() : ts.factory.createFalse();
  }
  if (Array.isArray(value)) {
    return ts.factory.createArrayLiteralExpression(
      value.map((item) => valueToExpression(item)),
      false,
    );
  }
  if (typeof value === 'object') {
    const properties = Object.entries(value as Record<string, unknown>).map(([key, propValue]) =>
      ts.factory.createPropertyAssignment(propertyName(key), valueToExpression(propValue)),
    );
    return ts.factory.createObjectLiteralExpression(properties, true);
  }
  throw new Error(`valueToExpression: unsupported value type "${typeof value}"`);
}

const VALID_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
function propertyName(key: string): ts.PropertyName {
  return VALID_IDENTIFIER.test(key)
    ? ts.factory.createIdentifier(key)
    : ts.factory.createStringLiteral(key);
}

export function exportConstStatement(
  name: string,
  expression: ts.Expression,
  asConst = false,
): ts.Statement {
  const initializer = asConst
    ? ts.factory.createAsExpression(expression, ts.factory.createTypeReferenceNode('const'))
    : expression;
  return ts.factory.createVariableStatement(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier(name),
          undefined,
          undefined,
          initializer,
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );
}

/**
 * `export const <name>: <typeName> = <expression>;` — a type-annotated
 * (not `as const`) export. Contextual typing against the named interface
 * keeps literal-union properties (e.g. CtaStyle) narrowed correctly while
 * array-valued properties stay ordinary mutable arrays — `as const` would
 * instead turn every array into a readonly tuple, which is NOT assignable
 * to the plain `string[]` props the static section components declare.
 */
export function typedExportConst(
  name: string,
  typeName: string,
  expression: ts.Expression,
): ts.Statement {
  return ts.factory.createVariableStatement(
    [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          ts.factory.createIdentifier(name),
          undefined,
          ts.factory.createTypeReferenceNode(typeName),
          expression,
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );
}

export function jsxAttribute(name: string, expression: ts.Expression): ts.JsxAttribute {
  const value = ts.isStringLiteral(expression)
    ? expression
    : ts.factory.createJsxExpression(undefined, expression);
  return ts.factory.createJsxAttribute(ts.factory.createIdentifier(name), value);
}

export function jsxSpreadAttribute(expression: ts.Expression): ts.JsxSpreadAttribute {
  return ts.factory.createJsxSpreadAttribute(expression);
}

export function jsxSelfClosingElement(
  tagName: string,
  attributes: (ts.JsxAttribute | ts.JsxSpreadAttribute)[],
): ts.JsxSelfClosingElement {
  return ts.factory.createJsxSelfClosingElement(
    ts.factory.createIdentifier(tagName),
    undefined,
    ts.factory.createJsxAttributes(attributes),
  );
}

export function jsxElement(
  tagName: string,
  attributes: (ts.JsxAttribute | ts.JsxSpreadAttribute)[],
  children: ts.JsxChild[],
): ts.JsxElement {
  const identifier = ts.factory.createIdentifier(tagName);
  return ts.factory.createJsxElement(
    ts.factory.createJsxOpeningElement(
      identifier,
      undefined,
      ts.factory.createJsxAttributes(attributes),
    ),
    children,
    ts.factory.createJsxClosingElement(identifier),
  );
}

export function jsxFragment(children: ts.JsxChild[]): ts.JsxFragment {
  return ts.factory.createJsxFragment(
    ts.factory.createJsxOpeningFragment(),
    children,
    ts.factory.createJsxJsxClosingFragment(),
  );
}

export function propertyAccess(objectName: string, ...path: string[]): ts.Expression {
  let expression: ts.Expression = ts.factory.createIdentifier(objectName);
  for (const key of path) {
    expression = VALID_IDENTIFIER.test(key)
      ? ts.factory.createPropertyAccessExpression(expression, key)
      : ts.factory.createElementAccessExpression(expression, ts.factory.createStringLiteral(key));
  }
  return expression;
}

export function defaultExportFunctionComponent(
  name: string,
  bodyReturnExpression: ts.JsxChild,
): ts.Statement {
  const jsx = bodyReturnExpression as unknown as ts.Expression;
  return ts.factory.createFunctionDeclaration(
    [
      ts.factory.createModifier(ts.SyntaxKind.ExportKeyword),
      ts.factory.createModifier(ts.SyntaxKind.DefaultKeyword),
    ],
    undefined,
    ts.factory.createIdentifier(name),
    undefined,
    [],
    undefined,
    ts.factory.createBlock([ts.factory.createReturnStatement(jsx)], true),
  );
}
