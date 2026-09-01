import { useSettingsStore } from '../storage/settingsStore';
import { themes, fonts, type ThemeTokens } from './tokens';

export interface Theme {
  name: 'dark' | 'light';
  colors: ThemeTokens;
  fonts: typeof fonts;
  isDark: boolean;
}

export function useTheme(): Theme {
  const name = useSettingsStore((s) => s.theme);
  return {
    name,
    colors: themes[name],
    fonts,
    isDark: name === 'dark',
  };
}
