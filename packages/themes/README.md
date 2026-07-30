# @riznexia/themes

The Theme Engine's `ThemeProvider` abstraction and pluggable theme definitions — see [docs/21-implementation-roadmap.md](../../docs/21-implementation-roadmap.md) M7 and `DECISIONS.md` D-044+. Business logic (`apps/api/src/theme-engine/`) depends only on the `THEME_PROVIDER` DI token, never on a concrete theme (e.g. `RestaurantTheme`) directly.
