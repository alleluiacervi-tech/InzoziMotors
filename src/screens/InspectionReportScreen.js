import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import { colors, radius } from '../theme';

const SECTIONS = [
  { name: 'Exterior & Body', passed: 28, total: 28, status: 'pass' },
  { name: 'Engine & Transmission', passed: 24, total: 24, status: 'pass' },
  { name: 'Brakes & Suspension', passed: 18, total: 20, status: 'minor' },
  { name: 'Electrical & Electronics', passed: 22, total: 22, status: 'pass' },
  { name: 'Interior & Comfort', passed: 19, total: 19, status: 'pass' },
  { name: 'Tires & Wheels', passed: 16, total: 17, status: 'minor' },
];

export default function InspectionReportScreen({ navigation }) {
  return (
    <Screen background={colors.bg}>
      <BackHeader title="Inspection Report" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4 }}>
        {/* Score hero */}
        <View style={styles.hero}>
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>147</Text>
            <Text style={styles.scoreTotal}>/ 150</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Inspection Passed</Text>
            <Text style={styles.heroSub}>Certified by Inzozi on Jun 18, 2026</Text>
            <View style={styles.passBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#fff" />
              <Text style={styles.passBadgeText}>98% condition score</Text>
            </View>
          </View>
        </View>

        {/* Sections */}
        <Text style={styles.section}>Inspection breakdown</Text>
        {SECTIONS.map((s) => (
          <View key={s.name} style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: s.status === 'pass' ? colors.greenTint : colors.amberTint }]}>
              <Ionicons
                name={s.status === 'pass' ? 'checkmark' : 'alert'}
                size={18}
                color={s.status === 'pass' ? colors.green : colors.amber}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{s.name}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(s.passed / s.total) * 100}%`, backgroundColor: s.status === 'pass' ? colors.green : colors.amber }]} />
              </View>
            </View>
            <Text style={styles.rowCount}>{s.passed}/{s.total}</Text>
          </View>
        ))}

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.noteText}>
            3 minor items noted (brake pads ~40%, front tire wear). Full mechanic notes included in
            your purchase documents.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xxl, padding: 18 },
  scoreCircle: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontSize: 24, fontWeight: '800', color: colors.textPrimary },
  scoreTotal: { fontSize: 12, color: colors.textMuted, marginTop: -2 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  heroSub: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  passBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.green, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, marginTop: 8 },
  passBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  section: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginTop: 24, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.lg, padding: 14, marginBottom: 10 },
  rowIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: colors.border, marginTop: 8 },
  barFill: { height: 5, borderRadius: 3 },
  rowCount: { fontSize: 13, fontWeight: '800', color: colors.textPrimary },
  note: { flexDirection: 'row', gap: 10, backgroundColor: colors.blueTint, borderRadius: radius.lg, padding: 14, marginTop: 12 },
  noteText: { flex: 1, fontSize: 13, color: colors.slate700, lineHeight: 19 },
});
