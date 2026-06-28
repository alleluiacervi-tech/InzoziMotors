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
            label={car.timeLeft}
            style={styles.topLeft}
          />
        ) : car.inspected ? (
          <Badge variant="inspected" icon="checkmark" label="Inspected" style={styles.topLeft} />
        ) : null}

        <Pressable style={styles.heart} onPress={() => toggleSaveCar(car.id)} hitSlop={8}>
          <Ionicons
            name={saved ? 'heart' : 'heart-outline'}
            size={16}
            color={saved ? '#EF4444' : colors.slate700}
          />
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.price}>
          {formatPrice(isAuction ? car.currentBid : car.price)}
        </Text>
        
        <Text style={styles.title} numberOfLines={1}>
          {car.title}
        </Text>

        <Text style={styles.meta} numberOfLines={1}>
          {formatMiles(car.mileage)} · {car.transmission}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.seller} numberOfLines={1}>
            {isAuction ? `${car.bids} bids` : car.seller}
          </Text>
          {car.returnDays ? (
            <Text style={styles.badgeText}>{car.returnDays}d return</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  imageWrap: { height: 110, backgroundColor: colors.border },
  image: { width: '100%', height: '100%' },
  topLeft: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 3 },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 10 },
  price: { fontSize: 16, fontWeight: '800', color: colors.textPrimary },
  title: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 4 },
  meta: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
  },
  seller: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, flex: 1 },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.primary, backgroundColor: colors.blueTint, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
});
