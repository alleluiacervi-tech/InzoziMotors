import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BackHeader from '../components/BackHeader';
import Badge from '../components/Badge';
import { useApp } from '../context/AppContext';
import { colors, radius } from '../theme';
import { formatPrice } from '../data/cars';

export default function SellerDashboardScreen({ navigation }) {
  const { sellerListings } = useApp();
  const activeCount = sellerListings.filter((l) => l.status === 'live').length;
  const totalBids = sellerListings.reduce((sum, l) => sum + (l.bids || 0), 0);

  const STATS = [
    { label: 'Active', value: String(activeCount) },
    { label: 'Total bids', value: String(totalBids) },
    { label: 'Sold', value: '3' },
  ];

  return (
    <Screen background={colors.bg}>
      <BackHeader
        title="Selling"
        onBack={() => navigation.goBack()}
        right={
          <Pressable style={styles.addBtn} onPress={() => navigation.navigate('ListingWizard')}>
            <Ionicons name="add" size={22} color={colors.slate700} />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 4 }}>
        <View style={styles.stats}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.section}>Active auctions</Text>
        {sellerListings.map((l) => (
          <View key={l.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Image source={{ uri: l.image }} style={styles.thumb} resizeMode="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{l.title}</Text>
                <Text style={styles.cardReserve}>Reserve {formatPrice(l.reserve)}</Text>
                <Badge variant="live" dot label={`Live \u00b7 ${l.timeLeft}`} style={{ marginTop: 8 }} />
              </View>
            </View>
            <View style={styles.cardBottom}>
              <View>
                <Text style={styles.bidLabel}>CURRENT HIGH BID</Text>
                <Text style={styles.bidValue}>{formatPrice(l.currentBid)}</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.bidLabel}>BIDS</Text>
                <Text style={styles.bidCount}>{l.bids}</Text>
              </View>
              <Pressable style={styles.viewBtn}>
                <Text style={styles.viewText}>View</Text>
              </Pressable>
            </View>
          </View>
        ))}

        <Pressable style={styles.newListing} onPress={() => navigation.navigate('ListingWizard')}>
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.newListingText}>Create new listing</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addBtn: { width: 42, height: 42, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xl, padding: 14 },
  statLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
  section: { fontSize: 16, fontWeight: '800', color: colors.textPrimary, marginTop: 22, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderSoft, borderRadius: radius.xxl, overflow: 'hidden', marginBottom: 12 },
  cardTop: { flexDirection: 'row', gap: 12, padding: 14 },
  thumb: { width: 84, height: 64, borderRadius: 12, backgroundColor: colors.border },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  cardReserve: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  bidLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  bidValue: { fontSize: 20, fontWeight: '800', color: colors.green },
  bidCount: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  viewBtn: { backgroundColor: colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.md },
  viewText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  newListing: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: radius.xl, paddingVertical: 16, marginTop: 8 },
  newListingText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
});
