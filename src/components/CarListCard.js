import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, iconSize } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../context/AppContext';
import { getMarketDiff, getSavedCount, getNeighborhood } from '../data/marketData';
import Price from './Price';
import BrandMark from './BrandMark';
import { PHOTO } from '../utils/photo';
import Photo from './Photo';
import Touchable from './Touchable';

// A search-results row: photo left, the facts a buyer triages on right.
//
// The photo FILLS its side of the card (cover). It used to be `contain`ed into
// a 118×108 box beside a taller body, so every car floated in grey bands and
// the list looked unfinished. The body is four lines, in the order people
// scan: what it is, its year/km/fuel, where it is and its inspection score,
// then the price on one line. At most one tag, because a row with two chips
// and a two-line price was taller than the photo beside it.
//
// The registration month is gone. It was computed from the listing id —
// `parseInt(uuid) % 12` — so it was invented for every car and NaN for most.

const PHOTO_W = 124;
const ROW_H = 118;

function CarListCard({ car, onPress }) {
  const { isCarSaved, toggleSaveCar, brandLogo, t } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const saved = isCarSaved(car.id);
  const price = car.type === 'auction' ? car.currentBid : car.price;
  const marketDiff = getMarketDiff(car);
  const belowMarket = typeof marketDiff === 'number' && marketDiff < 0;
  const highDemand = getSavedCount(car) >= 10;
  const km = `${Number(car.mileage ?? 0).toLocaleString('en-US')} km`;
  // The year is already in the title.
  const specs = [km, car.fuel, car.transmission].filter(Boolean).join(' · ');

  return (
    <Touchable
      scaleTo={0.985}
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${car.title}, ${specs}`}
    >
      <View style={styles.imageWrap}>
        <Photo uri={car.image} width={PHOTO.CARD} style={styles.image} resizeMode="cover" />
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <BrandMark name={car.make} logoUrl={brandLogo?.(car.make)} size={20} style={styles.brand} />
          <Text style={styles.title} numberOfLines={2}>{car.title}</Text>
          <Touchable
            scaleTo={0.88}
            haptic="selection"
            onPress={() => toggleSaveCar(car.id)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t(saved ? 'home.removeSaved' : 'home.saveCar', { title: car.title })}
            accessibilityState={{ selected: saved }}
          >
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={iconSize.md}
              color={saved ? colors.primary : colors.textMuted}
            />
          </Touchable>
        </View>

        <Text style={styles.meta} numberOfLines={1}>{specs}</Text>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={11} color={colors.textMuted} />
          <Text style={[styles.meta, styles.shrink]} numberOfLines={1}>{getNeighborhood(car)}</Text>
          {car.inspectionScore ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Ionicons name="shield-checkmark" size={11} color={colors.green} />
              <Text style={styles.scoreText} numberOfLines={1}>{t('home.inspected', { score: car.inspectionScore })}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.priceRow}>
          <Price amountRwf={price} size="list" inline style={styles.shrink} />
          {belowMarket ? (
            <View style={styles.tagGreen}>
              <Text style={styles.tagGreenText} numberOfLines={1}>{t('home.belowMarket', { percent: Math.abs(marketDiff) })}</Text>
            </View>
          ) : highDemand ? (
            <View style={styles.tagAmber}>
              <Text style={styles.tagAmberText} numberOfLines={1}>{t('home.highDemand')}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Touchable>
  );
}

export default memo(CarListCard);

// A function of the live theme — see the same note in Price.js.
function makeStyles(colors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      minHeight: ROW_H,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: radius.lg,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    imageWrap: {
      // Fixed size — iOS lets an unconstrained image's natural dimensions
      // inflate the row height, so never rely on stretch here.
      width: PHOTO_W,
      minHeight: ROW_H,
      backgroundColor: colors.surfaceAlt,
    },
    image: { ...StyleSheet.absoluteFillObject },
    body: { flex: 1, paddingLeft: spacing.md, paddingRight: 10, paddingVertical: 10, justifyContent: 'space-between' },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
    brand: { marginTop: 0 },
    title: { flex: 1, ...typography.cardTitle, fontSize: 14, lineHeight: 18, color: colors.textPrimary },
    meta: { ...typography.cardMeta, color: colors.textMuted },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    shrink: { flexShrink: 1 },
    dot: { ...typography.cardMeta, color: colors.textMuted, marginHorizontal: 2 },
    scoreText: { ...typography.cardMeta, fontFamily: typography.bodyStrong.fontFamily, color: colors.greenText, flexShrink: 0 },
    priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
    tagGreen: {
      backgroundColor: colors.greenTint,
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm, flexShrink: 0,
    },
    // Red is reserved for prices, primary actions, selected states and the
    // Certified+ badge. None of those is a tag.
    tagGreenText: { ...typography.badge, fontSize: 12, color: colors.greenText },
    tagAmber: {
      backgroundColor: colors.amberTint,
      paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm, flexShrink: 0,
    },
    tagAmberText: { ...typography.badge, fontSize: 12, color: colors.amberText },
  });
}
