import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows, fonts } from '../theme';
import { useApp } from '../context/AppContext';
import Badge from './Badge';
import { monthlyEstimate } from '../data/finance';

const getInzoziYear = (car) => String(car.year);

const getInzoziMileage = (car) => `${car.mileage.toLocaleString('en-US')} km`;

const getInzoziLocation = (car) => {
  const loc = car.location || '';
  if (loc.includes('Nyarutarama')) return 'Nyarutarama';
  if (loc.includes('Kiyovu')) return 'Kiyovu';
  if (loc.includes('Kanombe')) return 'Kanombe';
  if (loc.includes('Kimihurura')) return 'Kimihurura';
  if (loc.includes('Remera')) return 'Remera';
  return 'Kigali';
};

const getInzoziPrice = (car) => `$${car.price.toLocaleString('en-US')}`;

export default function CarCard({ car, onPress, hideOverlay = false, rank = null }) {
  const { isCarSaved, toggleSaveCar } = useApp();
  const saved = isCarSaved(car.id);
  const isContract = car.type === 'auction';
  const isRental = car.listingType === 'rental';

  return (
    <Pressable style={[styles.card, shadows.card]} onPress={onPress}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: car.image }} style={styles.image} resizeMode="cover" />

        {!hideOverlay && (
          <>
            {car.inspected ? (
              <View style={styles.certBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#fff" />
                <Text style={styles.certBadgeText}>Certified</Text>
              </View>
            ) : isContract ? (
              <Badge variant="contract" label="In Contract" style={styles.topLeft} />
            ) : null}

            <Pressable style={styles.heart} onPress={() => toggleSaveCar(car.id)} hitSlop={10}>
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={15}
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
              <Ionicons name="star" size={10} color={colors.amber} /> {car.rating} ({car.trips} trips) · {getInzoziLocation(car)}
            </Text>
            <View style={styles.rentalPriceRow}>
              <Text style={styles.price}>${car.dailyRate}</Text>
              <Text style={styles.perDay}>/day</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.meta} numberOfLines={1}>{getInzoziYear(car)}</Text>
            <Text style={styles.meta} numberOfLines={1}>{getInzoziMileage(car)} · {getInzoziLocation(car)}</Text>
            <Text style={styles.price}>{getInzoziPrice(car)}</Text>
            {car.price ? (
              <Text style={styles.monthly}>Finance from ${monthlyEstimate(car.price)}/mo</Text>
            ) : null}
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
  certBadgeText: { color: '#fff', fontSize: 9, fontFamily: fonts.extraBold },
  heart: {
    position: 'absolute', top: 6, right: 6,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 10,
  },
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
  price: { fontFamily: fonts.extraBold, fontSize: 15, color: colors.primary, marginTop: 4, letterSpacing: -0.3 },
  rentalPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  perDay: { fontFamily: fonts.medium, fontSize: 11, color: colors.textMuted, marginLeft: 2 },
  monthly: { fontFamily: fonts.semiBold, fontSize: 10, color: colors.textMuted, marginTop: 1 },
});
