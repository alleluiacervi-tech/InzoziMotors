import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import Badge from './Badge';
import { getCertTier } from '../data/certification';
import { formatPrice } from '../data/cars';
import { PHOTO } from '../utils/photo';
import Photo from './Photo';

const getSawaYear = (car) => String(car.year);

const getSawaMileage = (car) => `${(car.mileage ?? 0).toLocaleString('en-US')} km`;

const getSawaLocation = (car) => {
  const loc = car.location || '';
  if (loc.includes('Nyarutarama')) return 'Nyarutarama';
  if (loc.includes('Kiyovu')) return 'Kiyovu';
  if (loc.includes('Kanombe')) return 'Kanombe';
  if (loc.includes('Kimihurura')) return 'Kimihurura';
  if (loc.includes('Remera')) return 'Remera';
  return 'Kigali';
};

const getSawaPrice = (car) => formatPrice(car.price ?? car.currentBid ?? 0);

export default function CarCard({ car, onPress, hideOverlay = false, rank = null }) {
  const { isCarSaved, toggleSaveCar } = useApp();
  const saved = isCarSaved(car.id);
  const isContract = car.type === 'auction';
  const isRental = car.listingType === 'rental';
  const tier = getCertTier(car);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, shadows.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${car.title}, ${getSawaPrice(car)}`}
    >
      <View style={styles.imageWrap}>
        <Photo uri={car.image} width={PHOTO.CARD} style={styles.image} resizeMode="contain" />

        {!hideOverlay && (
          <>
            {tier ? (
              <View style={[styles.certBadge, tier.key === 'plus' && { backgroundColor: colors.primary }]}>
                <Ionicons name="shield-checkmark" size={10} color="#fff" />
                <Text style={styles.certBadgeText}>{tier.short}</Text>
              </View>
            ) : isContract ? (
              <Badge variant="contract" label="In Contract" style={styles.topLeft} />
            ) : null}

            <Pressable
              style={({ pressed }) => [styles.heart, pressed && styles.heartPressed]}
              onPress={() => toggleSaveCar(car.id)}
              hitSlop={10}
              accessibilityRole="button"
              // Names the car, because a list of hearts is otherwise a list of
              // identical unlabelled buttons.
              accessibilityLabel={saved ? `Remove ${car.title} from saved` : `Save ${car.title}`}
              accessibilityState={{ selected: saved }}
            >
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={18}
                color={saved ? '#EF4444' : '#555'}
              />
            </Pressable>
          </>
        )}

        {rank !== null && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{car.title}</Text>
        {isRental ? (
          <>
            <Text style={styles.meta} numberOfLines={1}>
              {car.seats} seats · {car.transmission}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              <Ionicons name="star" size={10} color={colors.amber} /> {car.rating} ({car.trips} trips) · {getSawaLocation(car)}
            </Text>
            <View style={styles.rentalPriceRow}>
              <Text style={styles.price}>RWF {Number(car.dailyRate || 0).toLocaleString('en-RW')}</Text>
              <Text style={styles.perDay}>/day</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.meta} numberOfLines={1}>{getSawaYear(car)}</Text>
            <Text style={styles.meta} numberOfLines={1}>{getSawaMileage(car)} · {getSawaLocation(car)}</Text>
            {/* The 150-point score, at the size the price gets.
                It was a 10px chip in the corner of the photograph, ranked below
                a loan estimate Sawa does not underwrite — and it is the one
                fact that separates a Sawa car from a WhatsApp-group car. A
                buyer triaging a grid spends about a second per card; this is
                what that second should be spent on. */}
            {car.inspectionScore ? (
              <View style={styles.scoreRow}>
                <Ionicons name="shield-checkmark" size={12} color={colors.green} />
                <Text style={styles.scoreText}>{car.inspectionScore}/150 inspected</Text>
              </View>
            ) : null}
            <Text style={styles.price}>{getSawaPrice(car)}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPressed: { opacity: 0.94, transform: [{ scale: 0.992 }] },
  imageWrap: {
    aspectRatio: 4 / 3,
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  topLeft: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 5, paddingVertical: 2 },
  certBadge: {
    position: 'absolute', top: 7, left: 7,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(23,18,15,0.78)',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 5,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  scoreText: {
    fontSize: 11.5,
    fontFamily: fonts.bold,
    color: colors.green,
  },
  certBadgeText: { color: '#fff', fontSize: 10, fontFamily: fonts.extraBold },
  heart: {
    position: 'absolute', top: 6, right: 6,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
  heartPressed: { opacity: 0.76, transform: [{ scale: 0.92 }] },
  rankBadge: {
    position: 'absolute', bottom: 0, left: 0,
    backgroundColor: 'rgba(23,18,15,0.85)',
    width: 26, height: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  rankText: { fontFamily: fonts.extraBold, color: '#FFFFFF', fontSize: 12 },
  body: { paddingHorizontal: 10, paddingVertical: 10, flex: 1, gap: 2 },
  title: { fontFamily: fonts.bold, fontSize: 13, color: colors.textPrimary },
  meta: { fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted },
  price: { fontVariant: ['tabular-nums'], fontFamily: fonts.extraBold, fontSize: 15, color: colors.primary, marginTop: 4, letterSpacing: -0.3 },
  rentalPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  perDay: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted, marginLeft: 2 },
  monthly: { fontFamily: fonts.semiBold, fontSize: 11, color: colors.textMuted, marginTop: 1 },
});
