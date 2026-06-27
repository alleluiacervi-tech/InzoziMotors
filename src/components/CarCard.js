import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows } from '../theme';
import { formatPrice, formatMiles } from '../data/cars';
import { useApp } from '../context/AppContext';
import Badge from './Badge';

export default function CarCard({ car, onPress }) {
  const { isCarSaved, toggleSaveCar } = useApp();
  const saved = isCarSaved(car.id);
  const isAuction = car.type === 'auction';

  return (
    <Pressable style={[styles.card, shadows.card]} onPress={onPress}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: car.image }} style={styles.image} resizeMode="cover" />

        {isAuction ? (
          <Badge
            variant="auction"
            dot
            label={`Auction \u00b7 ${car.timeLeft}`}
            style={styles.topLeft}
          />
        ) : car.inspected ? (
          <Badge variant="inspected" icon="checkmark" label="Inspected" style={styles.topLeft} />
        ) : null}

        <Pressable style={styles.heart} onPress={() => toggleSaveCar(car.id)} hitSlop={8}>
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={18}
            color={saved ? '#EF4444' : colors.slate700}
          />
        </Pressable>

        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[styles.dot, { opacity: i === 0 ? 1 : 0.5 }]}
            />
          ))}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.priceRow}>
          <View>
            {isAuction ? (
              <Text style={styles.bidLabel}>CURRENT BID</Text>
            ) : null}
            <Text style={styles.price}>
              {formatPrice(isAuction ? car.currentBid : car.price)}
            </Text>
            {!isAuction && car.belowMarket ? (
              <Text style={styles.below}>
                {formatPrice(car.belowMarket)} below market
              </Text>
            ) : null}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {isAuction ? (
              <>
                <Text style={[styles.seller, { color: colors.green }]}>
                  {car.reserveMet ? 'Reserve met' : 'Reserve not met'}
                </Text>
                <Text style={styles.metaSmall}>{car.bids} bids</Text>
              </>
            ) : (
              <>
                <Text style={styles.seller}>{car.seller}</Text>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={12} color={colors.amber} />
                  <Text style={styles.metaSmall}>{car.rating}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        <Text style={styles.title}>{car.title}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>{formatMiles(car.mileage)}</Text>
          <View style={styles.sep} />
          <Text style={styles.meta}>{car.fuel}</Text>
          <View style={styles.sep} />
          <Text style={styles.meta}>{car.transmission}</Text>
        </View>

        <View style={styles.footer}>
          {isAuction ? (
            <>
              <Text style={styles.meta}>{car.seller}</Text>
              <View style={styles.bidBtn}>
                <Text style={styles.bidBtnText}>Place bid</Text>
              </View>
            </>
          ) : (
            <>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={styles.meta}>{car.distance} mi away</Text>
              {car.returnDays ? (
                <Badge variant="tag" label={`${car.returnDays}-day return`} style={{ marginLeft: 'auto' }} />
              ) : null}
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  imageWrap: { height: 170, backgroundColor: colors.border },
  image: { width: '100%', height: '100%' },
  topLeft: { position: 'absolute', top: 12, left: 12 },
  heart: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { position: 'absolute', bottom: 10, right: 12, flexDirection: 'row', gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  body: { padding: 14 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bidLabel: { fontSize: 11, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.3 },
  price: { fontSize: 21, fontWeight: '800', letterSpacing: -0.4, color: colors.textPrimary },
  below: { fontSize: 12, fontWeight: '700', color: colors.green, marginTop: 2 },
  seller: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  metaSmall: { fontSize: 12, color: colors.textSecondary },
  title: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginTop: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  meta: { fontSize: 13, color: colors.textSecondary },
  sep: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#CBD5E1' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  bidBtn: {
    marginLeft: 'auto',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9,
  },
  bidBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
