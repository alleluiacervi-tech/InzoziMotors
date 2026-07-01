import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, fonts } from '../theme';

// Inzozi Motors shield + checkmark logo mark, with optional wordmark.
export function LogoMark({ size = 26 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" fill={colors.primaryBright} />
      <Path
        d="M8.5 12l2.3 2.3L16 9.5"
        stroke="#fff"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function Logo({ size = 18, color = '#fff' }) {
  return (
    <View style={styles.row}>
      <LogoMark size={size + 8} />
      <Text style={[styles.word, { fontSize: size, color }]}>Inzozi Motors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  word: { fontFamily: fonts.extraBold, letterSpacing: -0.2 },
});
