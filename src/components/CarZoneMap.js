import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Circle, Text as SvgText } from 'react-native-svg';
import { colors, fonts } from '../theme';

// Interactive top-down car diagram. Each zone maps to a 150-pt inspection
// category and is colored by its result. Tapping a zone selects it.
//
// Zone map:
//   hood        → engine       dash strip → electronics
//   cabin       → interior     boot       → body (plus outer shell stroke)
//   wheel rims  → tyres        wheel discs → brakes
//   docs        → no physical zone; parent renders it as a row below.

const statusOf = (cat) => {
  const pct = cat.maxPts > 0 ? cat.earned / cat.maxPts : 0;
  return pct >= 1 ? 'pass' : pct >= 0.85 ? 'minor' : 'warn';
};

const STATUS_COLOR = {
  pass: colors.green,
  minor: colors.amber,
  warn: colors.statusRejected,
};

const WHEELS = [
  { rim: { x: 26, y: 64 }, disc: { cx: 35, cy: 91 } },
  { rim: { x: 176, y: 64 }, disc: { cx: 185, cy: 91 } },
  { rim: { x: 26, y: 300 }, disc: { cx: 35, cy: 327 } },
  { rim: { x: 176, y: 300 }, disc: { cx: 185, cy: 327 } },
];

export default function CarZoneMap({ categories, selected, onSelect }) {
  const byId = Object.fromEntries(categories.map((c) => [c.id, c]));
  const colorOf = (id) => STATUS_COLOR[statusOf(byId[id])];
  const fillOf = (id) => colorOf(id) + (selected === id ? '55' : '22');
  const strokeW = (id) => (selected === id ? 3 : 1.5);

  return (
    <View style={styles.wrap}>
      <Svg width={220} height={420} viewBox="0 0 220 420">
        {/* Outer shell — Body & Exterior */}
        <Rect
          x={40} y={15} width={140} height={390} rx={48}
          fill="#FBFDFB"
          stroke={colorOf('body')} strokeWidth={strokeW('body')}
          onPress={() => onSelect('body')}
        />

        {/* Wheels — rim = Tyres, disc = Brakes */}
        {WHEELS.map((w, i) => (
          <React.Fragment key={i}>
            <Rect
              x={w.rim.x} y={w.rim.y} width={18} height={54} rx={9}
              fill={fillOf('tyres')} stroke={colorOf('tyres')} strokeWidth={strokeW('tyres')}
              onPress={() => onSelect('tyres')}
            />
            <Circle
              cx={w.disc.cx} cy={w.disc.cy} r={6.5}
              fill={fillOf('brakes')} stroke={colorOf('brakes')} strokeWidth={strokeW('brakes')}
              onPress={() => onSelect('brakes')}
            />
          </React.Fragment>
        ))}

        {/* Hood — Engine & Drivetrain */}
        <Rect
          x={56} y={32} width={108} height={76} rx={22}
          fill={fillOf('engine')} stroke={colorOf('engine')} strokeWidth={strokeW('engine')}
          onPress={() => onSelect('engine')}
        />
        <SvgText x={110} y={74} textAnchor="middle" fontSize={10} fill={colors.textSecondary}>
          Engine
        </SvgText>

        {/* Dash strip — Electronics & Safety */}
        <Rect
          x={56} y={116} width={108} height={24} rx={8}
          fill={fillOf('electronics')} stroke={colorOf('electronics')} strokeWidth={strokeW('electronics')}
          onPress={() => onSelect('electronics')}
        />
        <SvgText x={110} y={132} textAnchor="middle" fontSize={9} fill={colors.textSecondary}>
          Electronics
        </SvgText>

        {/* Cabin — Interior & Comfort */}
        <Rect
          x={56} y={148} width={108} height={150} rx={14}
          fill={fillOf('interior')} stroke={colorOf('interior')} strokeWidth={strokeW('interior')}
          onPress={() => onSelect('interior')}
        />
        <SvgText x={110} y={228} textAnchor="middle" fontSize={10} fill={colors.textSecondary}>
          Interior
        </SvgText>

        {/* Boot — part of Body & Exterior */}
        <Rect
          x={56} y={306} width={108} height={80} rx={18}
          fill={fillOf('body')} stroke={colorOf('body')} strokeWidth={strokeW('body')}
          onPress={() => onSelect('body')}
        />
        <SvgText x={110} y={350} textAnchor="middle" fontSize={10} fill={colors.textSecondary}>
          Body
        </SvgText>
      </Svg>

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { label: 'Passed', color: colors.greenText },
          { label: 'Minor flags', color: colors.amberText },
          { label: 'Attention', color: colors.statusRejected },
        ].map((l) => (
          <View key={l.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: l.color }]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontFamily: fonts.medium, color: colors.textSecondary },
});
