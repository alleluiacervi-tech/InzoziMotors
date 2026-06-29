import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadows } from '../theme';
import { useApp } from '../context/AppContext';
import Badge from './Badge';

const CARD_IMG_H = Math.round(Dimensions.get('window').width * 0.42);

// Helper to format year: e.g. 2021 (21/03)
const getInzoziYear = (car) => {
  const yy = String(car.year).slice(-2);
  const monthVal = (parseInt(car.id) % 12) + 1;
  const mm = String(monthVal).padStart(2, '0');
  return `${car.year} (${yy}/${mm})`;
};

// Helper to format mileage in miles: 122,200 mi
const getInzoziMileage = (car) => {
  return `${car.mileage.toLocaleString('en-US')} mi`;
};

// Helper to map Kigali/US locations deterministically to Kigali regions
const getInzoziLocation = (car) => {
  const loc = car.location || '';
  if (loc.includes('Nyarutarama') || loc.includes('Francisco')) return 'Nyarutarama';
  if (loc.includes('Kiyovu') || loc.includes('Oakland')) return 'Kiyovu';
  if (loc.includes('Kanombe') || loc.includes('Jose')) return 'Kanombe';
  if (loc.includes('Kimihurura') || loc.includes('Berkeley')) return 'Kimihurura';
  if (loc.includes('Remera') || loc.includes('Palo Alto')) return 'Remera';
  return 'Kigali';
};

// Helper to map price to USD
const getInzoziPrice = (car) => {
  return `$${car.price.toLocaleString('en-US')}`;
};

export default function CarCard({ car, onPress, hideOverlay = false, rank = null }) {
  const { isCarSaved, toggleSaveCar } = useApp();
  const saved = isCarSaved(car.id);
  const isContract = car.type === 'auction';

  return (
    <Pressable style={[styles.card, shadows.card]} onPress={onPress}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: car.image }} style={styles.image} resizeMode="cover" />

        {!hideOverlay && (
          <>
            {/* Inspection badge — certified if inspected, otherwise auction label */}
            {car.inspected ? (
              <View style={styles.certBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#fff" />
                <Text style={styles.certBadgeText}>Certified</Text>
              </View>
            ) : isContract ? (
              <Badge variant="contract" label="In Contract" style={styles.topLeft} />
            ) : null}

            {/* Heart save toggle */}
            <Pressable style={styles.heart} onPress={() => toggleSaveCar(car.id)} hitSlop={10}>
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={15}
                color={saved ? '#EF4444' : '#555'}
              />
            </Pressable>
          </>
        )}

        {/* Rank Badge for popular section */}
        {rank !== null && (
          <View style={styles.rankBadge}>
            <Text style={styles.rankText}>{rank}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {car.title}
        </Text>
        
        <Text style={styles.meta} numberOfLines={1}>
          {getInzoziYear(car)}
        </Text>

        <Text style={styles.meta} numberOfLines={1}>
          {getInzoziMileage(car)} · {getInzoziLocation(car)}
        </Text>

        <Text style={styles.price}>
          {getInzoziPrice(car)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.sm, // Inzozi matches sharp/smaller radius
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageWrap: {
    height: CARD_IMG_H,
    backgroundColor: colors.surfaceAlt,
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  topLeft: { position: 'absolute', top: 6, left: 6, paddingHorizontal: 5, paddingVertical: 2 },
  certBadge: {
    position: 'absolute', top: 7, left: 7,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 5,
  },
  certBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  heart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  rankBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(21,128,61,0.92)',
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  body: { 
    paddingHorizontal: 8,
    paddingVertical: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  title: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  meta: { fontSize: 11, color: colors.textSecondary, marginBottom: 1 },
  price: { fontSize: 15, fontWeight: '800', color: colors.primary, marginTop: 4 },
});

