// ─────────────────────────────────────────────────────────────────────────────
// A brand's mark — its logo when we have one, its initials when we do not.
//
// The fallback is the design, not a placeholder for it. No brand logo is
// committed to this repository: they are third-party trademarks, and a binary
// carrying sixty of them is a binary shipping somebody else's assets to two app
// stores. Logos are uploaded by an operator, one at a time, to whatever the
// business is entitled to use — so at any moment some brands have one and some
// do not, and BOTH have to look deliberate.
//
// Hence: identical footprint either way, so a row of chips never reflows as
// logos arrive; the lettermark takes a stable colour derived from the name, so
// Toyota is always the same shade and the eye can learn it; and a logo that
// fails to load falls back rather than leaving a hole.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

// Deliberately muted and deliberately not brand-red. Signal Red is reserved for
// prices, primary actions, active states and the certified badge — a lettermark
// is an identifier, not a call to action.
const TINTS = ['#EDEBEA', '#E8EDEF', '#EFEBE6', '#E9EEE9', '#EEE9EE', '#EAEDF1'];
const INKS = ['#4A4040', '#3C4A50', '#4F463C', '#3E4A3E', '#4A3E4A', '#3B4450'];

/** Stable per name, so a brand keeps its colour between screens and sessions. */
function tintIndex(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return hash % TINTS.length;
}

/** "Land Rover" -> "LR", "Toyota" -> "TO", "BMW" -> "BM". Two characters, so
 *  every mark is the same visual weight regardless of the name's length. */
function initials(name) {
  const words = String(name || '?').trim().split(/[\s-]+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return String(words[0] || '?').slice(0, 2).toUpperCase();
}

export default function BrandMark({ name, logoUrl, size = 28, style }) {
  const [broken, setBroken] = useState(false);
  const label = String(name || '');
  const index = tintIndex(label);
  const box = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.28),
  };

  if (logoUrl && !broken) {
    return (
      <View style={[styles.frame, box, style]}>
        <Image
          source={{ uri: logoUrl }}
          style={{ width: size - 6, height: size - 6 }}
          // `contain`, always: brand marks are every aspect ratio there is, and
          // `cover` would crop a wide wordmark down to two letters of itself.
          resizeMode="contain"
          onError={() => setBroken(true)}
          accessibilityLabel={`${label} logo`}
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.frame, box, { backgroundColor: TINTS[index] }, style]}
      accessibilityLabel={label}
    >
      <Text style={[styles.initials, { color: INKS[index], fontSize: Math.round(size * 0.36) }]}>
        {initials(label)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  initials: { fontFamily: fonts.extraBold, letterSpacing: -0.2 },
});
