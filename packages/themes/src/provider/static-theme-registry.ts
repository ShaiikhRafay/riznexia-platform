import type { ThemeDefinition, ThemeProvider } from './theme-provider.interface';
import { corporateTheme } from '../definitions/corporate.theme';
import { dentalTheme } from '../definitions/dental.theme';
import { gymTheme } from '../definitions/gym.theme';
import { lawFirmTheme } from '../definitions/law-firm.theme';
import { medicalTheme } from '../definitions/medical.theme';
import { realEstateTheme } from '../definitions/real-estate.theme';
import { restaurantTheme } from '../definitions/restaurant.theme';
import { salonTheme } from '../definitions/salon.theme';

// Module M7 — the sole ThemeProvider implementation. Adding a ninth theme
// means adding one definition module and one line here; selection logic
// (apps/api/src/theme-engine/) never needs to change — that's what
// "pluggable" buys.
const REGISTERED_THEMES: ThemeDefinition[] = [
  restaurantTheme,
  salonTheme,
  dentalTheme,
  lawFirmTheme,
  gymTheme,
  realEstateTheme,
  medicalTheme,
  corporateTheme,
];

export class StaticThemeRegistry implements ThemeProvider {
  private readonly themesById = new Map<string, ThemeDefinition>(
    REGISTERED_THEMES.map((theme) => [theme.id, theme]),
  );

  getTheme(themeId: string): ThemeDefinition | undefined {
    return this.themesById.get(themeId);
  }

  listThemes(): ThemeDefinition[] {
    return [...this.themesById.values()];
  }
}
