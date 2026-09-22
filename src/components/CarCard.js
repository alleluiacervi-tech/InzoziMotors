import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, shadows, spacing, typography, iconSize } from '../theme';
import { useTheme } from '../theme/ThemeContext';
import { useApp } from '../context/AppContext';
import Badge from './Badge';
import { getCertTier } from '../data/certification';
import { formatPrice } from '../data/cars';
import Price from './Price';
import { PHOTO } from '../utils/photo';
import Photo from './Photo';
import Touchable from './Touchable';
import AppText from './AppText';

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
  const { isCarSaved, toggleSaveCar, t } = useApp();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const saved = isCarSaved(car.id);
  const isContract = car.type === 'auction';
  const isRental = car.listingType === 'rental';
  const tier = getCertTier(car);
  // Future-dated and unparsed-safe: a bad or past value must never render.
  // Informational only — the provider set this, it never hides the car or
  // blocks an inquiry. See backend migration 0037.
  const unavailableDate = isRental && car.unavailableUntil ? new Date(car.unavailableUntil) : null;
  const unavailableUntil =
    unavailableDate && !Number.isNaN(unavailableDate.getTime()) && unavailableDate.getTime() > Date.now()
      ? unavailableDate
      : null;

  return (
    <Touchable
      scaleTo={0.985}
      style={({ pressed }) => [styles.card, shadows.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${car.title}, ${getSawaPrice(car)}`}
    >
      <View style={styles.imageWrap}>
        <Photo uri={car.image} width={PHOTO.CARD} style={styles.image} resizeMode="cover" />

        {!hideOverlay && (
          <>
            {tier ? (
              <View style={[styles.certBadge, tier.key === 'plus' && { backgroundColor: colors.primary }]}>
                <Ionicons name="shield-checkmark" size={11} color={colors.white} />
                <AppText style={styles.certBadgeText} maxFontSizeMultiplier={1.2}>{tier.short}</AppText>
              </View>
            ) : isContract ? (
              <Badge variant="contract" label="In Contract" style={styles.topLeft} />
            ) : null}

            <Touchable
              scaleTo={0.88}
              haptic="selection"
              style={({ pressed }) => [styles.heart, pressed && styles.heartPressed]}
              onPress={() => toggleSaveCar(car.id)}
              hitSlop={10}
              accessibilityRole="button"
              // Names the car, because a list of hearts is otherwise a list of
              // identical unlabelled buttons.
              accessibilityLabel={t(saved ? 'home.removeSaved' : 'home.saveCar', { title: car.title })}
              accessibilityState={{ selected: saved }}
            >
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={iconSize.md}
                color={saved ? colors.primary : colors.textSecondary}
              />
            </Touchable>
          </>
        )}

        {rank !== null && (
          <View style={styles.rankBadge}>
            <AppText style={styles.rankText} maxFontSizeMultiplier={1.2}>{rank}</AppText>
          </View>
        )}

        {unavailableUntil && (
          <View style={styles.unavailableBadge}>
            <Ionicons name="time-outline" size={11} color={colors.white} />
            <AppText style={styles.unavailableBadgeText} maxFontSizeMultiplier={1.2} numberOfLines={1}>
              {t('home.unavailableUntil', { date: unavailableUntil.toLocaleDateString() })}
            </AppText>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{car.title}</Text>
        {isRental ? (
          <>
            <Text style={styles.meta} numberOfLines={1}>
              {car.seats} {t('home.seats')} · {car.transmission}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              <Ionicons name="star" size={10} color={colors.amber} /> {car.rating} ({car.trips} {t('home.trips')}) · {getSawaLocation(car)}
            </Text>
            <View style={styles.rentalPriceRow}>
              <Text style={styles.price}>{formatPrice(car.dailyRate || 0)}</Text>
              <Text style={styles.perDay}>{t('home.perDay')}</Text>
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
                <Text style={styles.scoreText}>{t('home.inspected', { score: car.inspectionScore })}</Text>
              </View>
            ) : null}
            <Price amountRwf={car.price ?? car.currentBid ?? 0} />
          </>
        )}
      </View>
    </Touchable>
  );
}

// A function of the live theme — see the same note in Price.js.
function makeStyles(colors) {
    return StyleSheet.create({
    card: {
      flex: 1,
      margin: spacing.xs + 2,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    // Scale now comes from Touchable's spring.
    cardPressed: { opacity: 0.94 },
    imageWrap: {
      aspectRatio: 4 / 3,
      backgroundColor: colors.surfaceAlt,
      position: 'relative',
    },
    image: { width: '100%', height: '100%' },

    // Every overlay sits on the same inset. These were 6, 7 and 6 — one pixel
    // apart, which reads as misalignment rather than as a decision.
    topLeft: { position: 'absolute', top: spacing.sm, left: spacing.sm, paddingHorizontal: 6, paddingVertical: 2 },
    certBadge: {
      position: 'absolute', top: spacing.sm, left: spacing.sm,
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.scrim,
      paddingHorizontal: spacing.sm, paddingVertical: 3,
      borderRadius: radius.sm,
    },
    certBadgeText: { ...typography.badge, color: colors.white },
    heart: {
      position: 'absolute', top: spacing.sm, right: spacing.sm,
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: 'rgba(255,255,255,0.92)',
      alignItems: 'center', justifyContent: 'center',
      zIndex: 10,
    },
    // Scale now comes from Touchable's spring.
    heartPressed: { opacity: 0.76 },
    rankBadge: {
      position: 'absolute', bottom: 0, left: 0,
      backgroundColor: colors.scrimStrong,
      width: 28, height: 28,
      alignItems: 'center', justifyContent: 'center',
    },
    rankText: { ...typography.badge, color: colors.white },
    unavailableBadge: {
      position: 'absolute', bottom: spacing.sm, right: spacing.sm, maxWidth: '70%',
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: colors.scrim,
      paddingHorizontal: spacing.sm, paddingVertical: 3,
      borderRadius: radius.sm,
    },
    // Was 9.5px. Nothing in this product should render under 11.
    unavailableBadgeText: { ...typography.badge, color: colors.white },

    body: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, flex: 1, gap: 2 },
    title: { ...typography.cardTitle, color: colors.textPrimary },
    meta: { ...typography.cardMeta, color: colors.textMuted },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: spacing.xs,
    },
    // The inspection score is the one fact separating a Sawa car from a
    // WhatsApp-group car, so it sits at meta weight but in the pass colour.
    scoreText: { ...typography.cardMeta, fontFamily: typography.bodyStrong.fontFamily, color: colors.greenText },
    price: { ...typography.cardPrice, color: colors.primary, marginTop: spacing.xs },
    rentalPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.xs },
    perDay: { ...typography.cardMeta, color: colors.textMuted, marginLeft: 3 },
    });
}
