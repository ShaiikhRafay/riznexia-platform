// Tailwind's JIT compiler only detects class names it can see as literal
// strings in source — `grid-cols-${n}` template interpolation would
// silently produce no CSS at all. Every combination this project's
// GridDefinition.columns can ever take (Module M8.1's LayoutConfiguration
// grid columns are a fixed {mobile:1, tablet:2, desktop:3} constant,
// D-051) is spelled out literally below so the scanner always finds it,
// even if a future manifest ever varies the counts.
const MOBILE_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};
const TABLET_COLS: Record<number, string> = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
};
const DESKTOP_COLS: Record<number, string> = {
  1: 'lg:grid-cols-1',
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
};

export function gridColumnsClassName(columns: {
  mobile: number;
  tablet: number;
  desktop: number;
}): string {
  const mobile = MOBILE_COLS[columns.mobile] ?? MOBILE_COLS[1];
  const tablet = TABLET_COLS[columns.tablet] ?? TABLET_COLS[2];
  const desktop = DESKTOP_COLS[columns.desktop] ?? DESKTOP_COLS[3];
  return `grid gap-token-md ${mobile} ${tablet} ${desktop}`;
}
