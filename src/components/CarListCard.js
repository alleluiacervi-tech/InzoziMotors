import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, fonts } from '../theme';
import { getCertTier } from '../data/certification';
import { useApp } from '../context/AppContext';
import { getMarketDiff, getSavedCount, getNeighborhood } from '../data/marketData';

// Encar-style horizontal list card: photo left, dense specs right.
// Built for scanning many cars quickly in search results.

const getRegYear = (car) => {
  const yy = String(car.year).slice(-2);
  const mm = String((parseInt(car.id) % 12) + 1).padStart(2, '0');
  return `${car.year} (${yy}/${mm})`;
};

export default function CarListCard({ car, onPress }) {
  const tier = getCertTier(car);
  const { isCarSaved, toggleSaveCar } = useApp();
  const saved = isCarSaved(car.id);
  const price = car.type === 'auction' ? car.currentBid : car.price;
  const marketDiff = getMarketDiff(car);
  const savedCount = getSavedCount(car);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Photo */}
      <View style={styles.imageWrap}>
        <Image source={{ uri: car.image }} style={styles.image} resizeMode="cover" />
        {tier && (
          <View style={[styles.certBadge, tier.key === 'plus' && { backgroundColor: colors.primary }]}>
            <Ionicons name="shield-checkmark" size={9} color="#fff" />
            <Text style={styles.certBadgeText}>{tier.short}</Text>
          </View>
        )}
      </View>

      {/* Specs */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{car.title}</Text>
          <Pressable onPress={() => toggleSaveCar(car.id)} hitSlop={10}>
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={17}
              color={saved ? '#EF4444' : colors.textMuted}
            />
          </Pressable>
        </View>

        <Text style={styles.meta} numberOfLines={1}>
          {getRegYear(car)} · {(car.mileage ?? 0).toLocaleString('en-US')} km
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {car.fuel} · {getNeighborhood(car)}
        </Text>

        <View style={styles.bottomRow}>
          <View style={styles.tagsRow}>
            {marketDiff < 0 && (
              <View style={styles.tagGreen}>
                <Text style={styles.tagGreenText}>{Math.abs(marketDiff)}% below market</Text>
              </View>
            )}
            {savedCount >= 10 && (
              <View style={styles.tagAmber}>
                <Text style={styles.tagAmberText}>High demand</Text>
              </View>
            )}
          </View>
          <Text style={styles.price}>${(price ?? 0).toLocaleString('en-US')}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 10,
  },
  imageWrap: {
    // Fixed size — iOS lets an unconstrained image's natural dimensions
    // inflate the row height, so never rely on stretch here.
    width: 118,
    height: 108,
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  certBadge: {
    position: 'absolute', top: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(23,18,15,0.78)',
    paddingHorizontal: 6, paddingVertical: 2.5,
    borderRadius: 4,
  },
  certBadgeText: { color: '#fff', fontSize: 8, fontFamily: fonts.extraBold },
  body: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 2, justifyContent: 'center' },
  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8, marginBottom: 2,
  },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.textPrimary },
  meta: { fontFamily: fonts.regular, fontSize: 11.5, color: colors.textMuted, lineHeight: 17 },
  bottomRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', gap: 8, marginTop: 6,
  },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, flex: 1 },
  tagGreen: {
    backgroundColor: colors.greenTint,
    paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 4,
  },
  tagGreenText: { fontSize: 9, fontFamily: fonts.bold, color: colors.primary },
  tagAmber: {
    backgroundColor: colors.amberTint,
    paddingHorizontal: 6, paddingVertical: 2.5, borderRadius: 4,
  },
  tagAmberText: { fontSize: 9, fontFamily: fonts.bold, color: colors.amberText },
  price: { fontFamily: fonts.extraBold, fontSize: 16, color: colors.primary, letterSpacing: -0.3 },
});
