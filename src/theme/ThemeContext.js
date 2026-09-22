// The theme-aware colour system's runtime half.
//
// colors.js exports two static palettes (`lightColors`/`darkColors`); this
// file is what decides which one a screen actually sees, and keeps that
// decision live while the app runs.
//
// Three-way, not two-way: `System` follows the OS setting and updates the
// instant it changes (someone flips Dark Mode from Control Center while the
// app is open, which is common enough to be the default expectation), while
// `Light`/`Dark` are an explicit, remembered override for the person who
// wants THIS app to look one way regardless of what the rest of their phone
// is doing. The override survives a relaunch via storage.js; the default,
// before anyone has ever touched the setting, is System — an app that opens
// in light mode inside an OS set to dark is the wrong first impression.
//
// WHY THIS IS A CONTEXT AND NOT JUST A HOOK EVERYONE CALLS INDEPENDENTLY:
// every screen needs to re-render together the instant the theme changes, and
// a shared Context with one subscription is what guarantees that — n
// independent useColorScheme() calls would each re-render on their own
// schedule, and the stored override needs exactly one in-flight read, not one
// per screen that mounts.
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';
import { getJSON, setJSON } from '../storage';

const STORAGE_KEY = 'themeMode';
const MODES = ['system', 'light', 'dark'];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState('system');
  // Only the FIRST read is loading; the value simply hasn't reached storage
  // yet, so the app renders in the default (system-follows) mode until it
  // does rather than blocking on it — a theme is not worth a launch delay.
  useEffect(() => {
    let live = true;
    getJSON(STORAGE_KEY, 'system').then((stored) => {
      if (live && MODES.includes(stored)) setModeState(stored);
    });
    return () => { live = false; };
  }, []);

  const setMode = useCallback((next) => {
    if (!MODES.includes(next)) return;
    setModeState(next);
    setJSON(STORAGE_KEY, next);
  }, []);

  // A missing/unknown system value (some Android builds, some simulators)
  // must resolve to light — the one theme that was already shipped, verified
  // and is the safe default, never to an unstyled or undefined state.
  const scheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const isDark = scheme === 'dark';

  const value = useMemo(
    () => ({
      colors: isDark ? darkColors : lightColors,
      scheme,
      isDark,
      mode,
      setMode,
    }),
    [isDark, scheme, mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * `{ colors, scheme, isDark, mode, setMode }` — the live theme.
 *
 * `colors` is the object every migrated screen should destructure instead of
 * the static `import { colors } from '../theme'`; `mode`/`setMode` back the
 * Settings toggle (System/Light/Dark); `scheme`/`isDark` are for anything
 * that needs to branch on the resolved theme directly (StatusBar style, an
 * image that only exists in one finish).
 *
 * Throws outside a ThemeProvider rather than silently returning light colours
 * — a screen that reads no theme at all is a bug worth seeing immediately,
 * not a screen that quietly never goes dark.
 */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() must be called within a ThemeProvider');
  return ctx;
}

export default ThemeProvider;
