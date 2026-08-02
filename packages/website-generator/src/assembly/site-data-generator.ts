import ts from 'typescript';
import type { MappedComponent } from './component-props-mapper';
import { COMPONENT_TEMPLATE_REGISTRY, FOOTER_TEMPLATE } from './component-template-registry';
import { buildPropsVariableNames } from './component-var-names';
import {
  importDeclaration,
  printStatements,
  typedExportConst,
  valueToExpression,
} from './ts-ast-helpers';

/**
 * Builds `lib/site-data.ts`'s source: one type-annotated
 * `export const <componentId>Props: <ComponentPropsType> = {...};` per
 * component in the manifest. Each literal props value is produced at
 * *generation time* (Node.js, iterating componentManifest.components — see
 * component-props-mapper.ts), never derived at runtime in the generated
 * project, and serialized through valueToExpression()'s single controlled
 * JS-value-to-AST-expression path — never string concatenation.
 */
export function generateSiteDataSource(mappedComponents: MappedComponent[]): string {
  const varNames = buildPropsVariableNames(
    mappedComponents.map((entry) => entry.component.componentId),
  );

  const importsByPath = new Map<string, Set<string>>();
  function addImport(path: string, typeName: string) {
    const existing = importsByPath.get(path) ?? new Set<string>();
    existing.add(typeName);
    importsByPath.set(path, existing);
  }

  const constStatements: ts.Statement[] = [];

  for (const entry of mappedComponents) {
    const template = entry.isFooterSection
      ? FOOTER_TEMPLATE
      : COMPONENT_TEMPLATE_REGISTRY[entry.component.componentType];
    const varName = varNames.get(entry.component.componentId)!;

    addImport(template.importPath, template.propsTypeName);
    constStatements.push(
      typedExportConst(varName, template.propsTypeName, valueToExpression(entry.props)),
    );
  }

  const importStatements: ts.Statement[] = [...importsByPath.entries()]
    .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
    .map(([path, typeNames]) => importDeclaration([...typeNames].sort(), path, true));

  return printStatements([...importStatements, ...constStatements]);
}
