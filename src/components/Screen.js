import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';

/**
 * Standard screen scaffold: safe-area top padding + background.
 *
 * `background`/`barStyle` default to the static light theme, unchanged from
 * before — NOT to useTheme(), even though this component is small and
 * central enough that it was tempting to. Three screens (the Import Brand
 * flow) render `<Screen>` with no explicit background at all, relying on
 * exactly this default, and their own text/card styling has not been
 * migrated onto useTheme() yet. A theme-aware default here would flip their
 * PAGE to dark while their own content styles stayed fixed for light —
 * near-black body text on a page that just went near-black. A screen's
 * background and its content have to migrate together or not at all.
 *
 * A screen that HAS fully migrated (reads `const { colors } = useTheme()`
 * and uses it throughout) passes its own live `background`/`barStyle`
 * explicitly, the way AppearanceScreen.js does — the same additive pattern
 * BackHeader's `palette` prop uses, for the same reason.
 */
export default function Screen({
  children,
  background = colors.bg,
  barStyle = 'dark-content',
  edges = true,
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: background, paddingTop: edges ? insets.top : 0 }]}>
      <StatusBar barStyle={barStyle} translucent backgroundColor="transparent" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
