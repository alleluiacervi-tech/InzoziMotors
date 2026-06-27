import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// The faux iOS status bar (9:41 + signal/wifi/battery) used at the top of every screen.
export default function PhoneStatusBar({ tint = '#0F172A' }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.time, { color: tint }]}>9:41</Text>
      <View style={styles.icons}>
        <Ionicons name="cellular" size={16} color={tint} />
        <Ionicons name="wifi" size={16} color={tint} />
        <Ionicons name="battery-full" size={22} color={tint} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 2,
  },
  time: { fontSize: 15, fontWeight: '600' },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
