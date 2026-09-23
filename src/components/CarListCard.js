import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography, iconSize } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { getCertTier } from '../data/certification';
import { useApp } from '../context/AppContext';
import { getMarketDiff, getSavedCount, getNeighborhood } from '../data/marketData';
import { formatPrice } from '../data/cars';
import Price from './Price';
import { PHOTO } from '../utils/photo';
import Photo from './Photo';
import Touchable from './Touchable';
import AppText from './AppText';

// Encar-style horizontal list card: photo left, dense specs right.
// Built for scanning many cars quickly in search results.

const getRegYear = (car) => {
  const yy = String(car.year).slice(-2);
  const mm = String((parseInt(car.id) % 12) + 1).padStart(2, '0');
  return `${car.year} (${yy}/${mm})`;
};

export default function CarListCard({ car, onPress }) {
  const tier = getCertTier(car);
  const { isCarSaved, toggleSaveCar, t } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const saved = isCarSaved(car.id);
  const price = car.type === 'auction' ? car.currentBid : car.price;
  const marketDiff = getMarketDiff(car);
  const savedCount = getSavedCount(car);
  const belowMarket = typeof marketDiff === 'number' && marketDiff < 0;
  const highDemand = savedCount >= 10;

  return (
    <Touchable scaleTo={0.985} style={styles.card} onPress={onPress}>
      {/* Photo */}
      <View style={styles.imageWrap}>
        <Photo uri={car.image} width={PHOTO.CARD} style={styles.image} resizeMode="contain" />
        {tier && (
          <View style={[styles.certBadge, tier.key === 'plus' && { backgroundColor: colors.primary }]}>
            <Ionicons name="shield-checkmark" size={9} color="#fff" />
            <AppText style={styles.certBadgeText} maxFontSizeMultiplier={1.2}>{tier.short}</AppText>
          </View>
        )}
      </View>

      {/* Specs */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{car.title}</Text>
          <Touchable
            scaleTo={0.88}
            haptic="selection"
            onPress={() => toggleSaveCar(car.id)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t(saved ? 'home.removeSaved' : 'home.saveCar', { title: car.title })}
            accessibilityState={{ selected: saved }}
          >
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={iconSize.md}
              color={saved ? '#EF4444' : colors.textMuted}
            />
          </Touchable>
        </View>

        <Text style={styles.meta} numberOfLines={1}>
          {getRegYear(car)} · {(car.mileage ?? 0).toLocaleString('en-US')} km
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {car.fuel} · {getNeighborhood(car)}
        </Text>

        {/* The row has room, and this is the differentiator. See CarCard. */}
        {car.inspectionScore ? (
          <View style={styles.scoreRow}>
            <Ionicons name="shield-checkmark" size={11} color={colors.green} />
            <Text style={styles.scoreText}>{t('home.inspected', { score: car.inspectionScore })}</Text>
          </View>
        ) : null}

        {/* Stacked, not side by side: in a 118px-photo row the price (and its
            dollar line) needs the full width, or it overprints the tags. */}
        {(belowMarket || highDemand) && (
          <View style={styles.tagsRow}>
            {/* Only when the server actually computed a market position from
                real comparables. getMarketDiff returns null otherwise. */}
            {belowMarket && (
              <View style={styles.tagGreen}>
                <Text style={styles.tagGreenText}>{t('home.belowMarket', { percent: Math.abs(marketDiff) })}</Text>
              </View>
            )}
            {highDemand && (
              <View style={styles.tagAmber}>
                <Text style={styles.tagAmberText}>{t('home.highDemand')}</Text>
              </View>
            )}
          </View>
        )}
        <Price amountRwf={price} style={styles.priceBlock} />
      </View>
    </Touchable>
  );
}

// A function of the live theme — see the same note in Price.js.
function makeStyles(colors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.lg,
      overflow: 'hidden',
      marginBottom: spacing.md,
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
      position: 'absolute', top: spacing.sm, left: spacing.sm,
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.scrim,
      paddingHorizontal: 6, paddingVertical: 3,
      borderRadius: radius.sm,
    },
    certBadgeText: { ...typography.badge, color: colors.white },
    body: { flex: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 2, justifyContent: 'center' },
    titleRow: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', gap: spacing.sm, marginBottom: 2,
    },
    title: { flex: 1, ...typography.cardTitle, color: colors.textPrimary },
    meta: { ...typography.cardMeta, color: colors.textMuted, lineHeight: 17 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
    priceBlock: { marginTop: 6 },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    scoreText: { ...typography.cardMeta, fontFamily: typography.bodyStrong.fontFamily, color: colors.greenText },
    tagGreen: {
      backgroundColor: colors.greenTint,
      paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.sm,
    },
    // Was colors.primary — brand red lettering on a green "pass" chip. It cleared
    // contrast but said the wrong thing, and red is reserved for prices, primary
    // actions, selected states and the Certified+ badge. None of those is a tag.
    tagGreenText: { ...typography.badge, color: colors.greenText },
    tagAmber: {
      backgroundColor: colors.amberTint,
      paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.sm,
    },
    tagAmberText: { ...typography.badge, color: colors.amberText },
    price: { ...typography.cardPrice, color: colors.primary },
  });
}
