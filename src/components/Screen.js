import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, themeState } from '../theme/colors';

/** Standard screen scaffold: safe-area top padding, page background, status bar. */
export default function Screen({
  children,
  background = colors.bg,
  barStyle = themeState.scheme === 'dark' ? 'light-content' : 'dark-content',
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
