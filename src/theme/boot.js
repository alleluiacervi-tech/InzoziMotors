import { Appearance } from 'react-native';
import { applyScheme, themeState } from './colors';
import { getJSON } from '../storage';

export const THEME_MODE_KEY = 'themeMode';
export const THEME_MODES = ['system', 'light', 'dark'];

// An unknown system value (some Android builds report null) resolves to light.
export function resolveScheme(mode, systemScheme = Appearance.getColorScheme()) {
  if (mode === 'light' || mode === 'dark') return mode;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export async function bootTheme() {
  const stored = await getJSON(THEME_MODE_KEY, 'system');
  themeState.mode = THEME_MODES.includes(stored) ? stored : 'system';
  applyScheme(resolveScheme(themeState.mode));
}
