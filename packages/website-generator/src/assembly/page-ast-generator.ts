import ts from 'typescript';
import type {
  ComponentManifest,
  ContentManifest,
  LayoutConfiguration,
} from '@riznexia/shared-types';
import type { MappedComponent } from './component-props-mapper';
import {
  COMPONENT_TEMPLATE_REGISTRY,
  FOOTER_TEMPLATE,
  type ComponentTemplateEntry,
} from './component-template-registry';
import { buildPropsVariableNames } from './component-var-names';
import { structuredDataToJsonLd } from './jsonld-mapper';
import {
  defaultExportFunctionComponent,
  importDeclaration,
  jsxAttribute,
  jsxElement,
  jsxFragment,
  jsxSelfClosingElement,
  jsxSpreadAttribute,
  printStatements,
  valueToExpression,
} from './ts-ast-helpers';

/**
 * Builds `app/page.tsx`'s source: the `Metadata` export (title/description/
 * OpenGraph/Twitter/canonical, from ContentManifest.seoMetadata), one
 * `<script type="application/ld+json">` per ContentManifest.structuredData
 * binding, and the `<main id="main-content">` JSX tree wrapping every
 * LayoutConfiguration.pageStructure section (in order) in a SectionWrapper
 * — except the final 'footer' section, rendered via the dedicated Footer
 * component. Every JSX call site is `<ComponentName {...xProps} />`, where
 * `xProps` is one of the type-annotated consts site-data-generator.ts
 * already emitted — this file only decides *which* components render and
 * in *what order*, never their content.
 */
export function generatePageSource(
  componentManifest: ComponentManifest,
  contentManifest: ContentManifest,
  layoutConfiguration: LayoutConfiguration,
  mappedComponents: MappedComponent[],
  businessName: string,
): string {
  const varNames = buildPropsVariableNames(
    mappedComponents.map((entry) => entry.component.componentId),
  );
  const componentsById = new Map(
    mappedComponents.map((entry) => [entry.component.componentId, entry]),
  );

  const usedTemplates = new Map<string, ComponentTemplateEntry>();
  const usedPropsVarNames = new Set<string>();
  function useTemplate(template: ComponentTemplateEntry, componentId: string): string {
    usedTemplates.set(template.componentName, template);
    const varName = varNames.get(componentId);
    if (!varName) {
      throw new Error(
        `page-ast-generator: no props variable found for componentId "${componentId}" — site-data and page generation must run over the same manifest.`,
      );
    }
    usedPropsVarNames.add(varName);
    return varName;
  }

  const navigation = componentManifest.components.find(
    (component) => component.componentType === 'navigation',
  );
  if (!navigation) {
    throw new Error(
      'page-ast-generator: ComponentManifest has no "navigation" component — every manifest must include exactly one (component-generator.ts invariant).',
    );
  }
  const navigationVarName = useTemplate(
    COMPONENT_TEMPLATE_REGISTRY.navigation,
    navigation.componentId,
  );
  const navigationElement = jsxSelfClosingElement(
    COMPONENT_TEMPLATE_REGISTRY.navigation.componentName,
    [jsxSpreadAttribute(ts.factory.createIdentifier(navigationVarName))],
  );

  const sidebarComponent = componentManifest.components.find(
    (component) => component.componentType === 'sidebar',
  );
  const sidebarElement = sidebarComponent
    ? jsxSelfClosingElement(COMPONENT_TEMPLATE_REGISTRY.sidebar.componentName, [
        jsxSpreadAttribute(
          ts.factory.createIdentifier(
            useTemplate(COMPONENT_TEMPLATE_REGISTRY.sidebar, sidebarComponent.componentId),
          ),
        ),
      ])
    : null;

  const sectionElements: ts.JsxChild[] = [];
  let footerElement: ts.JsxChild | null = null;

  const orderedSections = [...layoutConfiguration.pageStructure].sort((a, b) => a.order - b.order);
  for (const section of orderedSections) {
    const sectionComponentId = `section-${section.sectionId}`;
    const mapped = componentsById.get(sectionComponentId);
    if (!mapped) {
      throw new Error(
        `page-ast-generator: no ComponentDefinition found for section "${sectionComponentId}" declared in LayoutConfiguration.pageStructure.`,
      );
    }

    if (mapped.isFooterSection) {
      const footerVarName = useTemplate(FOOTER_TEMPLATE, mapped.component.componentId);
      footerElement = jsxSelfClosingElement(FOOTER_TEMPLATE.componentName, [
        jsxSpreadAttribute(ts.factory.createIdentifier(footerVarName)),
      ]);
      continue;
    }

    const childElements: ts.JsxChild[] = mapped.component.childComponentIds.map((childId) => {
      const child = componentsById.get(childId);
      if (!child) {
        throw new Error(
          `page-ast-generator: no ComponentDefinition found for child componentId "${childId}" referenced by section "${sectionComponentId}".`,
        );
      }
      const template = COMPONENT_TEMPLATE_REGISTRY[child.component.componentType];
      const varName = useTemplate(template, child.component.componentId);
      return jsxSelfClosingElement(template.componentName, [
        jsxSpreadAttribute(ts.factory.createIdentifier(varName)),
      ]);
    });

    const sectionVarName = useTemplate(COMPONENT_TEMPLATE_REGISTRY.section, sectionComponentId);
    sectionElements.push(
      jsxElement(
        COMPONENT_TEMPLATE_REGISTRY.section.componentName,
        [jsxSpreadAttribute(ts.factory.createIdentifier(sectionVarName))],
        childElements,
      ),
    );
  }

  const mainElement: ts.JsxChild = sidebarComponent
    ? jsxElement(
        'div',
        [
          jsxAttribute(
            'className',
            ts.factory.createStringLiteral(
              'mx-auto flex max-w-6xl flex-col gap-token-lg px-token-md md:flex-row',
            ),
          ),
        ],
        layoutConfiguration.sidebar?.position === 'right'
          ? [mainLandmark(sectionElements), sidebarElement as ts.JsxChild]
          : [sidebarElement as ts.JsxChild, mainLandmark(sectionElements)],
      )
    : mainLandmark(sectionElements);

  const jsonLdElements: ts.JsxChild[] = contentManifest.structuredData.map((binding, index) => {
    const json = JSON.stringify(structuredDataToJsonLd(binding));
    return jsxSelfClosingElement('script', [
      jsxAttribute('type', ts.factory.createStringLiteral('application/ld+json')),
      jsxAttribute('key', ts.factory.createStringLiteral(`jsonld-${index}-${binding.type}`)),
      jsxAttribute('dangerouslySetInnerHTML', valueToExpression({ __html: json })),
    ]);
  });

  const pageBody = jsxFragment([
    navigationElement,
    mainElement,
    ...(footerElement ? [footerElement] : []),
    ...jsonLdElements,
  ]);

  const metadataExpression = valueToExpression(buildMetadataObject(contentManifest, businessName));

  const propsImportNames = [...usedPropsVarNames].sort();
  const templateImports: ts.Statement[] = [...usedTemplates.entries()]
    .sort(([, a], [, b]) => a.importPath.localeCompare(b.importPath))
    .map(([componentName, template]) => importDeclaration([componentName], template.importPath));

  const statements: ts.Statement[] = [
    importDeclaration(['Metadata'], 'next', true),
    ...templateImports,
    importDeclaration(propsImportNames, '@/lib/site-data'),
    ts.factory.createVariableStatement(
      [ts.factory.createModifier(ts.SyntaxKind.ExportKeyword)],
      ts.factory.createVariableDeclarationList(
        [
          ts.factory.createVariableDeclaration(
            ts.factory.createIdentifier('metadata'),
            undefined,
            ts.factory.createTypeReferenceNode('Metadata'),
            metadataExpression,
          ),
        ],
        ts.NodeFlags.Const,
      ),
    ),
    defaultExportFunctionComponent('Page', pageBody),
  ];

  return printStatements(statements);
}

function mainLandmark(children: ts.JsxChild[]): ts.JsxElement {
  return jsxElement(
    'main',
    [jsxAttribute('id', ts.factory.createStringLiteral('main-content'))],
    children,
  );
}

function buildMetadataObject(
  contentManifest: ContentManifest,
  businessName: string,
): Record<string, unknown> {
  const { seoMetadata } = contentManifest;
  const title = seoMetadata.metaTitle?.value ?? businessName;
  const description = seoMetadata.metaDescription?.value ?? '';
  const keywords = [...seoMetadata.keywords.value, ...seoMetadata.localSeoSuggestions.value];

  return {
    title,
    description,
    keywords,
    openGraph: { title, description, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: { canonical: '/' },
  };
}
