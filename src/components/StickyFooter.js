import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Bottom action bar that respects the home indicator. Screens used to guess
// with a hardcoded paddingBottom: 28 — on notched devices that left the
// primary CTA half under the system gesture area.
//
// Pass the screen's own chrome (borders, background, horizontal padding)
// through `style`; this only owns the bottom inset.
export default function StickyFooter({ style, children }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[style, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
      {children}
    </View>
  );
}
