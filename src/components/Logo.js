import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { colors, fonts } from '../theme';

// Shared Inzozi car silhouette (car-space ~ x:150–872, y:366–658).
// White body with cut-out "glass" (set glass to the surrounding background).
function CarPaths({ body = '#FFFFFF', glass = '#DA2C2C' }) {
  return (
    <G>
      <Path
        d="M 150 520 C 150 494 160 480 188 472 L 250 456 C 262 452 271 446 279 436
           C 300 398 339 370 390 366 L 560 366 C 610 368 648 390 675 430
           C 689 450 705 460 724 464 L 812 478 C 850 484 872 498 872 524 L 872 550
           C 872 556 867 560 860 560 L 160 560 C 153 560 150 554 150 548 Z"
        fill={body}
      />
      <Path d="M 316 450 C 332 410 360 388 392 386 L 468 386 L 468 450 Z" fill={glass} />
      <Path d="M 484 386 L 556 386 C 596 388 622 410 636 450 L 484 450 Z" fill={glass} />
      <Circle cx="340" cy="566" r="92" fill={glass} />
      <Circle cx="706" cy="566" r="92" fill={glass} />
      <Circle cx="340" cy="566" r="85" fill={body} />
      <Circle cx="706" cy="566" r="85" fill={body} />
      <Circle cx="340" cy="566" r="37" fill={glass} />
      <Circle cx="706" cy="566" r="37" fill={glass} />
      <Circle cx="340" cy="566" r="12.5" fill={body} />
      <Circle cx="706" cy="566" r="12.5" fill={body} />
    </G>
  );
}

// Plain car glyph — car in `body` color on transparent (cut-outs = the bg it sits on).
export function CarGlyph({ width = 120, body = '#FFFFFF', glass = colors.primary }) {
  const height = width * (312 / 742);
  return (
    <Svg width={width} height={height} viewBox="140 358 742 312">
      <CarPaths body={body} glass={glass} />
    </Svg>
  );
}

// Badge mark — a mini app-icon (red rounded tile + white car). Reads on any background.
export function LogoMark({ size = 30 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id="inzoziTile" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E5403A" />
          <Stop offset="1" stopColor="#C11C1C" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100" height="100" rx="24" fill="url(#inzoziTile)" />
      <G transform="translate(50, 51)">
        <G transform="scale(0.104)">
          <G transform="translate(-511, -512)">
            <CarPaths body="#FFFFFF" glass="#D42222" />
          </G>
        </G>
      </G>
    </Svg>
  );
}

export default function Logo({ size = 18, color = '#fff' }) {
  return (
    <View style={styles.row}>
      <LogoMark size={size + 12} />
      <Text style={[styles.word, { fontSize: size, color }]}>Inzozi Motors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  word: { fontFamily: fonts.extraBold, letterSpacing: -0.2 },
});
