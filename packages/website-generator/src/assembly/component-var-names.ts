// Deterministic componentId -> unique JS identifier mapping, shared by
// site-data-generator.ts (which declares the const) and page-ast-generator.ts
// (which references it) so both generators agree on the same name without
// either needing to re-derive it from the other's output.
function camelCase(id: string): string {
  const parts = id.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (parts.length === 0) {
    return 'component';
  }
  const [first, ...rest] = parts;
  return [
    (first ?? '').toLowerCase(),
    ...rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()),
  ].join('');
}

/**
 * Builds a componentId -> propsVariableName map, guaranteeing uniqueness
 * (a numeric suffix is appended on collision) — deterministic because
 * componentIds are visited in the manifest's own fixed array order.
 */
export function buildPropsVariableNames(componentIds: string[]): Map<string, string> {
  const used = new Set<string>();
  const names = new Map<string, string>();

  for (const componentId of componentIds) {
    const base = `${camelCase(componentId)}Props`;
    let candidate = base;
    let suffix = 2;
    while (used.has(candidate)) {
      candidate = `${base}${suffix}`;
      suffix += 1;
    }
    used.add(candidate);
    names.set(componentId, candidate);
  }

  return names;
}
