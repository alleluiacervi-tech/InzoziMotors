// The theme for this run of the app.
//
// The palette is chosen once, at launch, by src/theme/boot.js and never swapped
// mid-session. Most screens build their StyleSheets from `colors` at module
// load, so a live swap would repaint the handful of components that read this
// context and leave every other screen on the old palette: dark cards on a
// light page, light text on a light card. That shipped once. One palette per
// run keeps every surface on the same theme.
//
// So `System` follows the phone's setting as of launch, and choosing a mode in
// Settings saves it and restarts the app to apply it everywhere at once. The
// session survives a restart (it lives in the keychain).
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { DevSettings, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { colors, themeState } from './colors';
import { THEME_MODE_KEY, THEME_MODES, resolveScheme } from './boot';
import { setJSON } from '../storage';

async function restartApp() {
  if (Platform.OS === 'web') {
    globalThis.location.reload();
  } else if (__DEV__) {
    DevSettings.reload();
  } else if (Updates.isEnabled) {
    // If this fails, the saved choice still applies on the next launch.
    await Updates.reloadAsync().catch(() => {});
  }
}

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(themeState.mode);

  const setMode = useCallback(async (next) => {
    if (!THEME_MODES.includes(next)) return;
    setModeState(next);
    await setJSON(THEME_MODE_KEY, next);
    if (resolveScheme(next) !== themeState.scheme) await restartApp();
  }, []);

  const value = useMemo(
    () => ({
      colors,
      scheme: themeState.scheme,
      isDark: themeState.scheme === 'dark',
      mode,
      setMode,
    }),
    [mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** `{ colors, scheme, isDark, mode, setMode }` for this run of the app. */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() must be called within a ThemeProvider');
  return ctx;
}

export default ThemeProvider;
