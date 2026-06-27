import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { colors, radius } from '../theme';

const POPULAR = ['Tesla Model 3', 'Toyota RAV4', 'Honda Accord', 'Ford F-150', 'BMW 4 Series'];
const BODY_TYPES = [
  { label: 'SUV', icon: 'car-sport-outline' },
  { label: 'Sedan', icon: 'car-outline' },
  { label: 'Truck', icon: 'bus-outline' },
  { label: 'EV', icon: 'flash-outline' },
  { label: 'Coupe', icon: 'speedometer-outline' },
  { label: 'Van', icon: 'cube-outline' },
];

export default function SearchScreen({ navigation }) {
  return (
    <Screen background={colors.bg}>
      <View style={styles.head}>
        <Text style={styles.h1}>Search</Text>
        <Pressable style={styles.searchBar} onPress={() => navigation.navigate('SearchResults')}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <Text style={styles.searchPlaceholder}>Search make, model, or keyword</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4 }}>
        <Text style={styles.section}>Popular searches</Text>
        <View style={styles.chips}>
          {POPULAR.map((p) => (
            <Pressable key={p} style={styles.chip} onPress={() => navigation.navigate('SearchResults')}>
              <Ionicons name="trending-up" size={14} color={colors.primary} />
              <Text style={styles.chipText}>{p}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.section, { marginTop: 24 }]}>Browse by body type</Text>
        <View style={styles.grid}>
          {BODY_TYPES.map((b) => (
            <Pressable key={b.label} style={styles.tile} onPress={() => navigation.navigate('SearchResults')}>
              <View style={styles.tileIcon}>
                <Ionicons name={b.icon} size={24} color={colors.primary} />
              </View>
              <Text style={styles.tileText}>{b.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.filterCta} onPress={() => navigation.navigate('Filters')}>
          <Ionicons name="options-outline" size={20} color="#fff" />
          <Text style={styles.filterCtaText}>Advanced filters</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingTop: 8 },
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: colors.textPrimary },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    height: 50,
    marginTop: 14,
  },
  searchPlaceholder: { fontSize: 15, color: colors.textMuted },
  section: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.slate700 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  tile: {
    width: '30.7%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    borderRadius: radius.xl,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 10,
  },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.blueTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  filterCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: 16,
    marginTop: 24,
  },
  filterCtaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
