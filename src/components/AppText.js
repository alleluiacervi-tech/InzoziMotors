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

export default function AppText({ style, children, ...props }) {
  const flat = StyleSheet.flatten(style) || {};
  const weight = String(flat.fontWeight || '400');
  const mapped = WEIGHT_MAP[weight] || fonts.regular;
  const finalFamily = flat.fontFamily || mapped;
  return (
    <Text style={[style, { fontFamily: finalFamily }]} {...props}>
      {children}
    </Text>
  );
}
