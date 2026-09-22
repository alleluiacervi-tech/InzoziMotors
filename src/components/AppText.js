import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { fonts } from '../theme';

const WEIGHT_MAP = {
  '400': fonts.regular,
  '500': fonts.medium,
  '600': fonts.semiBold,
  '700': fonts.bold,
  '800': fonts.extraBold,
  '900': fonts.black,
};

// Dynamic Type at the OS's largest accessibility sizes (up to ~3.1x on iOS)
// will clip or overlap inside anything with a fixed footprint — a 17px badge
// circle, a single-line button, a pill. This is for exactly those spots:
// text keeps scaling with the user's setting, just capped short of the size
// that breaks its container. Body copy in a scrolling list has no such
// ceiling — it reflows onto more lines instead — so it stays on plain
// react-native Text and is left alone on purpose; only fixed-chrome text
// (badges, tab labels, buttons, pills) should reach for this component.
const DEFAULT_MAX_FONT_SCALE = 1.6;

export default function AppText({ style, children, maxFontSizeMultiplier = DEFAULT_MAX_FONT_SCALE, ...props }) {
  const flat = StyleSheet.flatten(style) || {};
  const weight = String(flat.fontWeight || '400');
  const mapped = WEIGHT_MAP[weight] || fonts.regular;
  const finalFamily = flat.fontFamily || mapped;
  return (
    <Text style={[style, { fontFamily: finalFamily }]} maxFontSizeMultiplier={maxFontSizeMultiplier} {...props}>
      {children}
    </Text>
  );
}
