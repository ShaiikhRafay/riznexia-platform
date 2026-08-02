import type { DevicePreviewPreset } from '@riznexia/shared-types';

// Fixed, industry-standard viewport widths — never business/theme-derived
// (same "fixed constant, not derived from either input" technique as
// M8.1's BREAKPOINTS/M8.2's RADIUS_SCALE). Rendering the actual pixels at
// each width is a future preview-UI concern (D-076 — this phase
// deliberately doesn't stand up a live rendering surface); these presets
// are the fixed contract that UI is expected to resize its viewport to.
export const DEVICE_PRESETS: DevicePreviewPreset[] = [
  { mode: 'desktop', widthPx: 1440 },
  { mode: 'tablet', widthPx: 768 },
  { mode: 'mobile', widthPx: 375 },
];
