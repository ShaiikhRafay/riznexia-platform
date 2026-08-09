import { describe, expect, it } from 'vitest';
import { DASHBOARD_WIDGETS } from './widget-registry';
import { PERMISSIONS } from '@/src/lib/permissions';

// F2 Improvement 1 — a structural check on the registry itself, ahead of
// (and cheaper than) full component rendering: every entry is well-formed,
// so a future widget added with a typo'd id/permission fails fast here.
describe('DASHBOARD_WIDGETS registry', () => {
  it('names all 8 founder-specified M12 dashboard widgets, no more, no fewer', () => {
    expect(DASHBOARD_WIDGETS).toHaveLength(8);
    expect(DASHBOARD_WIDGETS.map((widget) => widget.id).sort()).toEqual(
      [
        'ai-usage',
        'conversion',
        'costs',
        'deployments',
        'leads',
        'sales',
        'system-health',
        'website-status',
      ].sort(),
    );
  });

  it('has a unique id per entry', () => {
    const ids = DASHBOARD_WIDGETS.map((widget) => widget.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every requiredPermission (when set) is a real, closed-taxonomy permission', () => {
    for (const widget of DASHBOARD_WIDGETS) {
      if (widget.requiredPermission !== null) {
        expect(PERMISSIONS).toContain(widget.requiredPermission);
      }
    }
  });

  it('every entry has a real component reference', () => {
    for (const widget of DASHBOARD_WIDGETS) {
      expect(typeof widget.component).toBe('function');
    }
  });
});
