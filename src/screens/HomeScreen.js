import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import CarCard from '../components/CarCard';
import SectionHeader from '../components/SectionHeader';
import { colors, radius, shadows } from '../theme';
import { cars, categories } from '../data/cars';
import { useApp } from '../context/AppContext';

export default function HomeScreen({ navigation }) {
  const { currentUser } = useApp();
  const [active, setActive] = useState('All');
  const filtered = active === 'All' ? cars : cars.filter((c) => c.category === active);

  return (
    <Screen background={colors.bg}>
      {/* Header block */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <View>
              <Text style={styles.locationLabel}>LOCATION</Text>
              <View style={styles.locationValue}>
                <Text style={styles.locationCity}>San Francisco, CA</Text>
                <Ionicons name="chevron-down" size={11} color={colors.textSecondary} />
              </View>
            </View>
          </View>
          <Pressable style={styles.bell} onPress={() => navigation.navigate('Messages')}>
            <Ionicons name="notifications-outline" size={21} color={colors.slate700} />
            <View style={styles.bellDot} />
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Pressable style={styles.searchBar} onPress={() => navigation.navigate('SearchResults')}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <Text style={styles.searchPlaceholder}>Search make, model, or keyword</Text>
          </Pressable>
          <Pressable style={styles.filterBtn} onPress={() => navigation.navigate('Filters')}>
            <Ionicons name="options-outline" size={20} color="#fff" />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListHeaderComponent={
          <View>
            <View style={styles.greeting}>
              <Text style={styles.greetSmall}>Good morning, {currentUser.name.split(' ')[0]}</Text>
              <Text style={styles.greetBig}>Let's find your next car</Text>
            </View>

            <FlatList
              horizontal
              data={categories}
              keyExtractor={(c) => c}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pills}
              renderItem={({ item }) => {
                const on = item === active;
                return (
                  <Pressable
                    style={[styles.pill, on ? styles.pillOn : styles.pillOff]}
                    onPress={() => setActive(item)}
                  >
                    <Text style={[styles.pillText, { color: on ? '#fff' : colors.slate600 }]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              }}
            />

            <SectionHeader title="Recommended for you" onAction={() => navigation.navigate('SearchResults')} />
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
            <CarCard car={item} onPress={() => navigation.navigate('VehicleDetail', { car: item })} />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 },
  locationValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationCity: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  bell: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.amber,
    borderWidth: 2,
    borderColor: '#fff',
  },
  searchRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    height: 48,
  },
  searchPlaceholder: { fontSize: 15, color: colors.textMuted },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.blueGlow,
  },
  greeting: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  greetSmall: { fontSize: 14, color: colors.textSecondary },
  greetBig: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, color: colors.textPrimary, marginTop: 2 },
  pills: { paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  pill: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill },
  pillOn: { backgroundColor: colors.primary },
  pillOff: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  pillText: { fontSize: 13, fontWeight: '700' },
});
