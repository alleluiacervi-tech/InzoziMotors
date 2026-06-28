import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import CarCard from '../components/CarCard';
import { useApp } from '../context/AppContext';
import { colors } from '../theme';

export default function SavedScreen({ navigation }) {
  const { getSavedCars } = useApp();
  const saved = getSavedCars();
  const [tab, setTab] = useState('Saved');

  return (
    <Screen background={colors.bg}>
      <View style={styles.head}>
        <Text style={styles.h1}>Saved</Text>
        <View style={styles.segment}>
          {['Saved', 'Watching'].map((t) => (
            <Pressable
              key={t}
              style={[styles.segItem, tab === t && styles.segItemOn]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.segText, { color: tab === t ? colors.textPrimary : colors.textMuted }]}>
                {t} {t === 'Saved' ? `(${saved.length})` : '(0)'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={tab === 'Saved' ? saved : []}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        keyExtractor={(c) => c.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <CarCard car={item} onPress={() => navigation.navigate('VehicleDetail', { car: item })} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="heart-outline" size={48} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>{tab === 'Saved' ? 'No saved cars yet' : 'No cars being watched'}</Text>
            <Text style={styles.emptySub}>
              {tab === 'Saved'
                ? 'Tap the heart icon on any listing to save it here.'
                : "Cars you're watching in auctions will appear here."}
            </Text>
            <Pressable style={styles.browseBtn} onPress={() => navigation.navigate('Home')}>
              <Text style={styles.browseBtnText}>Browse cars</Text>
            </Pressable>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingTop: 8 },
  h1: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, color: colors.textPrimary },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 4,
    marginTop: 14,
  },
  segItem: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  segItemOn: { backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  segText: { fontSize: 14, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  emptySub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  browseBtn: {
    marginTop: 24,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  browseBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  columnWrapper: { paddingHorizontal: 4 },
});
